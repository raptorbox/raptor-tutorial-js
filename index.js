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
        let devices = pager.getContent()
        if(devices){
            log.debug('total devices: %d', devices.length)
        }
    })

}

const searchDeviceByName = (name) => {

    let query = {
            name: { contains: name }
        }
    return raptor.Inventory().search(query)
    .then((pager) => {
        let devices = pager.getContent()
        if(devices){
            log.debug("Devices found: %d", pager.getTotalElements())
        }
        return devices[0]
    })

}

const searchDeviceByUserId = (userId) => {

    let query = {
            userId: userId
        }
    return raptor.Inventory().search(query)
    .then((pager) => {
        let devices = pager.getContent()
        if(devices){
            log.debug("Devices found: %d", pager.getTotalElements())
        }
        return devices[0]
    })
    
}

const pullUpdate = (device) => {

    let stream = device.getStream('test_stream')

    return raptor.Stream().list(stream)
    .then((pager) => {
        let records = pager.getContent()
        log.debug(records.length)
        // log.debug(JSON.stringify(records))
        return device
    })
    
}

const pullLastUpdate = (device) => {

    let stream = device.getStream('test_stream')

    return raptor.Stream().lastUpdate(stream)
    .then((record) => {
        log.debug(JSON.stringify(record))
    })
    
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

const randomName = (prefix) => {
    prefix = prefix || ''
    const rnd = Math.round(Math.random() * Date.now())
    return `user_${rnd}`
}

const newUser = (username) => {
    username = username || randomName()
    const u = new Raptor.models.User()
    u.username = username
    u.password = 'passwd_' + u.username
    u.email = u.username + '@test.raptor.local'
    u.roles = ['user']
    return raptor.Admin().User().create(u)
}

const newUserWithOwnerId = (username, ownerId) => {
    username = username || randomName()
    const u = new Raptor.models.User()
    u.username = username
    u.password = 'passwd_' + u.username
    u.email = u.username + '@test.raptor.local'
    u.ownerId = ownerId
    return raptor.Admin().User().create(u)
}

const searchAndDeleteUser = (username) => {
    return raptor.Admin().User().list({username: username})
    .then((user) => {
        // log.debug(user)
        user.getContent().forEach((u) => {
            return Promise.resolve(raptor.Admin().User().delete(u.id))
        })
    })
}

const app = () => {
    const users = [
        newUser(),
        newUser(),
    ]
    return Promise.all(users).then((ops) => {

        const
            u1 = ops[0],
            u2 = ops[1],
            u1id = u1.id,
            u2id = u2.id

        return raptor.App().create({
            name: 'app',
            roles: [{name: 'role1', permissions: ['admin_device']}, {name: 'role2', permissions: ['read_user']}],
            users: [
                { id: u1id, roles: ['role1', 'role2'] },
                { id: u2id, roles: ['role2'] },
            ]
        }).then((app) => {
            log.debug('Application (name) %s (id= %s) created', app.name, app.id)
            return Promise.all([
                raptor.Inventory().create({ name: 'dev1', domain: app.id }),
                raptor.Inventory().create({ name: 'dev2', domain: app.id })
            ]).then((res) => {
                log.debug('Devices created and added to app')
                const  dev1 = res[0],
                    dev2 = res[1]

                return Promise.resolve(app)
            })
        }).then((res) => {
            return raptor.App().read(res).then((app) => {
                log.debug('Application (name) %s (id= %s) loaded', app.name, app.id)
                return app
            })
        }).then((app) => {
            let users = app.users
            let roles = app.roles
            let name = app.name
            app.users = [{id: users[0].id, roles: users[0].roles}]
            app.roles.push({name: 'role3', permissions: ['admin_own_device','admin_own_user']})
            return raptor.App().update(app).then((resApp) => {
                log.debug('Application (name) %s (id= %s) updated', resApp.name, resApp.id)
                return resApp
            })
        }).then((app) => {
            log.debug('App user\'s deleted')
            return Promise.resolve(raptor.Admin().User().delete(u1id))
            .then(() => {
                return raptor.Admin().User().delete(u2id)
            })
            .then(() => {
                return raptor.App().delete(app).then(() => {
                    log.debug('App deleted')
                    return Promise.resolve()
                })
            })
        }).then((app) => {
            return raptor.App().list().then((pager) => {
                log.debug('Apps available %s', pager.getTotalElements())
                return Promise.resolve()
            })
        })
    })
}

const main = () => {

    if (config.logLevel) {
        log.level = config.logLevel
    }

    let userid = ''
    let device = null

    raptor.Auth().login()
        .then((user) => {
            log.debug(user)
            log.debug('Logged in as %s (id=%s)', user.username, user.id)
            userid = user.id
            return loadDevice(code)
            // return Promise.resolve(true)
        })
        .then((d) => {
            device = d
            log.debug('Got device `%s`, subscribing to data', device.id)
            return subscribe(device)
        })
        .then(() => {
            log.debug('Got device `%s`, subscribing to device events', device.id)
            return subscribeEvents(device)
        })
        .then(() => {
            log.debug('Pushing data to device `%s`', device.id)
            return pushData(device, 10)
        })
        .then(() => {
            log.debug('Adding stream to device `%s`', device.id)
            return addStream(device)
        })
        .then(() => {
            log.debug('Adding channels to new stream of device `%s`', device.id)
            return addChannelsToStream(device)
        })
        .then(() => {
            log.debug('Update stream of device `%s`', device.id)
            return updateStream(device)
        })
        .then(() => {
            log.debug('Update device `%s`', device.id)
            return updateDevice(device)
        })
        .then((d) => {
            device = d 
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
            log.debug('Search device by user id %s', userid)
            return searchDeviceByUserId(userid)
        })
        .then(() => {
            log.debug('Search device by name')
            return searchDeviceByName(device.name)
        })
        .then(() => {
            log.debug('Pulling last update of stream')
            return pullUpdate(device)
        })
        .then(() => {
            log.debug('Pulling last update of stream')
            return pullLastUpdate(device)
        })
        .then(() => {
            log.debug('Creating user with owner id')
            return newUserWithOwnerId('user_with_owner', userid)
        })
        .then(() => {
            log.debug('Deleting user')
            return searchAndDeleteUser('user_with_owner')
        })
        .then(() => {
            log.debug('Application example')
            return app()
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