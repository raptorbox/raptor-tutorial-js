const Raptor = require('raptor-sdk')
const config = require(process.env.CONFIG || './config.default.json')
const log = require('winston')

const code = '0001'
const deviceCount = 1

const raptor = new Raptor(config.raptor)

const loadDevice = (code) => {
    log.info('Search device with code %s', code)
    return raptor.Inventory()
        .search({
            properties: {code}
        })
        .then((result) => {
            // found a device
            if (result && result.length) {
                log.info('Found device %s', result[0].name)
                return Promise.resolve(result[0])
            }

            // create a new device
            log.info('Creating a new example device')

            return createDevice()
        })
}

const createDevice = () => {
    const device = new Raptor.models.Device()
    device.name = 'Test Device ' + deviceCount
    device.properties.code = code
    device.setStream({
        'name': 'test_stream',
        'channels': {
            // channel_name: channel_type // only number, string and boolean allowed
            'temperature': 'number',
            'light': 'number',
            'title': 'string',
            'active': 'boolean'
        }
    })
    device.setStream({
        'name': 'test_strean_2',
        'channels': {
            'test_channel': 'number',
        }
    })

    log.debug('Creating device: %j', device.toJSON())

    return raptor.Inventory().create(device)
}

const addStream = (device) => {

    device.setStream({
        'name': 'test_stream_new',
        'channels': {
            // channel_name: channel_type // only number, string and boolean allowed
            'light': 'number',
            'title': 'string',
            'active': 'boolean'
        }
    })

    return raptor.Inventory().update(device)

}

const addChannelsToStream = (device) => {

    device.setStream({
        'name': 'test_stream_new',
        'channels': {
            // channel_name: channel_type // only number, string and boolean allowed
            'light': 'number',
            'title': 'string',
            'active': 'boolean',
            'updated': 'boolean'
        }
    })

    return raptor.Inventory().update(device)

}

const updateStream = (device) => {

    device.setStream({
        'name': 'test_stream_new',
        'channels': {
            // channel_name: channel_type // only number, string and boolean allowed
            'title': 'string',
            'updated': 'boolean'
        }
    })

    return raptor.Inventory().update(device)

}

const updateDevice = (device) => {

    device.name = 'test device name changes'
    // properties can be used to store more data about device
    device.properties = {'foo':'bar'}

    return raptor.Inventory().update(device)

}

const listDevices = () => {

    return raptor.Inventory().list()
    .then((pager) => {
        if(pager){
            log.debug('total devices: %d', pager.json.totalElements)
        }
    })

}

const searchDeviceByName = () => {

    let query = {
            name: { contains: 'test' }
        }
    return raptor.Inventory().search(query)
    .then((pager) => {
        log.debug('total devices: %d', pager.json.totalElements)
    })

}

const searchDeviceByUserId = (userId) => {

    let query = {
            properties: {userId}
        }
    return raptor.Inventory().search(query)
    .then((pager) => {
        log.debug('total devices: %d', pager.json.totalElements)
    })

}

const pullLastUpdate = (device) => {

    let stream = device.getStream('test_stream')

    return raptor.Stream().lastUpdate(stream)
    .then((record) => {
        console.log('pullLastUpdate: ', record)
    }).then(()=> Promise.resolve(device))

}

const subscribe = (device) => {
    return raptor.Stream()
        .subscribe(device.getStream('test_stream'), (data) => {
            log.info('Data received: %j', data)
        })
        .then(()=> Promise.resolve(device))
}

const subscribeEvents = (device) => {
    return raptor.Inventory()
        .subscribe(device, (event) => {
            log.info('Device Event received: %j', event)
        })
        .then(()=> Promise.resolve(device))
}

const pushData = (device, maxCounter) => {
    maxCounter = !maxCounter || maxCounter <= 0 ? 10 : maxCounter
    return new Promise(function(resolve, reject) {
        let counter = maxCounter
        const intv = setInterval(function() {
            let temp = Math.floor(Math.random()*20)
            const record = device.getStream('test_stream').createRecord({
                temperature: temp,
                light: Math.floor(Math.random()*100),
                title: 'Hello world ' + counter,
                active: (counter%2 == 0) ? true : false
            })
            log.debug('Sending data %d/%d', (maxCounter-counter)+1, maxCounter)
            raptor.Stream().push(record)
                .then(() => {
                    counter--
                    if (counter === 0) {
                        clearInterval(intv)
                        log.info('Send data completed')
                        resolve(device)
                    }
                })
                .catch((e) => {
                    clearInterval(intv)
                    log.warn('Send data failed: %s', e.message)
                    reject(e)
                })
        }, 1500)
    })
}

const main = () => {

    if (config.logLevel) {
        log.level = config.logLevel
    }

    let userid = ''

    raptor.Auth().login()
        .then((user) => {
            log.debug(user)
            log.debug('Logged in as %s (id=%s)', user.username, user.uuid)
            userid = user.uuid
            return loadDevice(code)
        })
        .then((device) => {
            log.debug('Got device `%s`, subscribing to data', device.id)
            return subscribe(device)
        })
        .then((device) => {
            log.debug('Got device `%s`, subscribing to device events', device.id)
            return subscribeEvents(device)
        })
        .then((device) => {
            log.debug('Pushing data to device `%s`', device.id)
            return pushData(device, 10)
        })
        .then((device) => {
            log.debug('Pulling last update of stream')
            return pullLastUpdate(device)
        })
        .then((device) => {
            log.debug('Adding stream to device `%s`', device.id)
            return addStream(device)
        })
        .then((device) => {
            log.debug('Adding channels to new stream of device `%s`', device.id)
            return addChannelsToStream(device)
        })
        .then((device) => {
            log.debug('Update stream of device `%s`', device.id)
            return updateStream(device)
        })
        .then((device) => {
            log.debug('Update device `%s`', device.id)
            return updateDevice(device)
        })
        .then((device) => {
            log.debug('Unsubscribing device `%s`', device.id)
            return raptor.Inventory().unsubscribe(device)
        })
        .then(() => {
            log.debug('Create device')
            return createDevice()
        })
        .then(() => {
            log.debug('List devices')
            return listDevices()
        })
        .then(() => {
            log.debug('Search device by name')
            return searchDeviceByName()
        })
        .then(() => {
            log.debug('Search device by user id %s', userid)
            return searchDeviceByUserId(userid)
        })
        .then(() => {
            log.info('Closing')
            process.exit(0)
        })
        .catch((e) => {
            log.error('Error: %s', e.message)
        })
}

main()
