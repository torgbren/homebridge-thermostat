# homebridge-thermostat

Supports thermostat devices on HomeBridge Platform

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-thermostat
3. Update your configuration file. See bellow for a sample. 

# Configuration

Configuration sample:

 ```
    {
        "bridge": {
            ...
        },
        
        "description": "...",

        "accessories": [
            {
                "accessory": "Thermostat",
                "name": "Thermostat Demo",
                "apiroute": "http://myurl.com",
                "maxTemp": 25,
                "minTemp": 15
                //optional
                "manufacturer": "Manu Facturer",
	               "model": "Model A",
	               "serialnumber": "123-456-789",
                "maxTemp": "26",
                "minTemp": "15",
                "username": "user",
                "password": "pass"
            }
        ],

        "platforms":[]
    }
```
# API Expectations

The `apiroute` is used for three main calls: Get from the thermostat, set the target temperature and set the targetHeatingCoolingState. Your API should provide

1. Get any thermostat info
```
GET /status
{
    targetHeatingCoolingState: INT_VALUE_0_TO_3,
    targetTemperature: FLOAT_VALUE,
    targetRelativeHumidity: FLOAT_VALUE,
    currentHeatingCoolingState: INT_VALUE_0_TO_2,
    currentTemperature: FLOAT_VALUE, //prev temperature
    currentRelativeHumidity: FLOAT_VALUE_AS_PERCENTAGE //prev humidity
    heatingThresholdTemperature: FLOAT_VALUE, //temperature to turn off heating (API does not support actually doing this. This must be done on the server side.)
    coolingThresholdTemperature: FLOAT_VALUE, //NOT IMPLEMENTED: temperature to turn off cooling (API does not support actually doing this. This must be done on the server side.) 
}
```

2. Set target HeatingCoolingState
```
GET /targetHeatingCoolingState/{INT_VALUE_0_TO_3}
OK (201)
```

3. Set target temperature
```
GET /targetTemperature/{FLOAT_VALUE}
OK (201)
```

4. Set target relative humidity
```
GET /targetRelativeHumidity/{FLOAT_VALUE}
OK (201)
```

# Heatmiser Support

Folder 'heatmiser' contains a contributed example of the API. It supports Heatmiser wireless thermostats, as long as https://github.com/thoukydides/heatmiser-wifi is installed and working.

