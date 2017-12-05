# Raptor-tutorial
Tutorial for Raptorbox - an open-source lightweight IoT platform 

## Pre-requisites

[Raptor](https://github.com/raptorbox/raptor) 
(Check the [Getting Started](https://github.com/raptorbox/raptor#getting-started) to set it up)

### Installation
1. Clone the project.
2. Build the project by running ``npm install`` in root folder
3. Replace username, password [here](https://github.com/raptorbox/raptor-tutorial-js/config.default.json) with the one you created with Raptor (mentioned in pre-requisites). 
4. Run Raptor in case of local instance, otherwise change the url in the above mentioned file to the one where your raptor instance is running.
5. Run ``node index.js``. It includes some simple functionality like login, creating device, stream and channel, updating them, pushing, pulling and droping data (records) of device etc. The id of the device created here will be used later for running the client. It also includes subscription of device data and events. 