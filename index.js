/*
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
            //optional
	    "timeout": 3000, //###Under development - In milliseconds
	    "update_interval": 7200, //###Under development - In milliseconds
	    "units": "C", //"C" for Celcius or "F" for Farenheit
	    "manufacturer": "Manu Facturer",
	    "model": "Model A",
	    "serialnumber": "123-456-789",
	    "firmware": "v.0.0.1", //###Under development 
	    "hardware": "A1", //###Under development 
            "maxTemp": "26",
            "minTemp": "15",
            "username": "user",
            "password": "pass"
        }
    ],

    "platforms":[]
}

*/



var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-thermostat", "Thermostat", Thermostat);
};


function Thermostat(log, config) {
	this.log = log;
	this.maxTemp = config.maxTemp || 25;
	this.minTemp = config.minTemp || 15;
	this.name = config.name;
	this.apiroute = config.apiroute || "apiroute";
	this.log(this.name, this.apiroute);
	this.username = config.username || null;
	this.password = config.password || null;
	
	//###################### TODO #########################################
	//Implement separate updateState function to reduce number of requests
	//this.timeout = config.timeout || "3000";
   	//this.update_interval = Number( config.update_interval || "7200" );

	if(this.username != null && this.password != null){
		this.auth = {
			user : this.username,
			pass : this.password
		};
	}
	this.units = config.units || "C";
   	//The value property of TemperatureDisplayUnits must be one of the following:
	//Characteristic.TemperatureDisplayUnits.CELSIUS = 0;
	//Characteristic.TemperatureDisplayUnits.FAHRENHEIT = 1;
	if (this.units=="F") {
		this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
	} else {
		this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
	}
	this.currentTemperature = 19;
	this.currentRelativeHumidity = 0.70;
	//The value property of CurrentHeatingCoolingState must be one of the following:
	//Characteristic.CurrentHeatingCoolingState.OFF = 0;
	//Characteristic.CurrentHeatingCoolingState.HEAT = 1;
	//Characteristic.CurrentHeatingCoolingState.COOL = 2;
	this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.AUTO;
	this.targetTemperature = 21;
	this.targetRelativeHumidity = 0.5;
	this.heatingThresholdTemperature = 21;
	this.coolingThresholdTemperature = 5;
	//The value property of TargetHeatingCoolingState must be one of the following:
	//Characteristic.TargetHeatingCoolingState.OFF = 0;
	//Characteristic.TargetHeatingCoolingState.HEAT = 1;
	//Characteristic.TargetHeatingCoolingState.COOL = 2;
	//Characteristic.TargetHeatingCoolingState.AUTO = 3;
	this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;

	this.thermostatService = new Service.Thermostat(this.name);

	//InformationService
	this.manufacturer = config.manufacturer || "HTTP Manufacturer";
   	this.model = config.model || "HTTP Model";
   	this.serialnumber = config.serialnumber || "HTTP Serial Number";
	this.firmware = config.firmware || "HTTP Firmware";
	this.hardware = config.hardware || "HTTP Hardware";
	
	//BatteryService
	this.batteryLevel = 99;
	this.chargingState = Characteristic.ChargingState.NOT_CHARGEABLE;
	this.statusLowBattery = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
	
}

Thermostat.prototype = {
	//Start
	identify: function(callback) {
		this.log("Identify requested!");
		callback(null);
	},
	//######################## TODO ########################
	//UpdateState
	//this.timeout = config.timeout || "3000";
   	//this.update_interval = Number( config.update_interval || "7200" );
	
	//Information Requests
	//Required
	getCurrentHeatingCoolingState: function(callback) {
		this.log("getCurrentHeatingCoolingState from:", this.apiroute+"/status");
		request.get({
			url: this.apiroute+"/status",
			auth: this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{targetHeatingCoolingState":3,"currentHeatingCoolingState":0,"targetTemperature":10,"temperature":12,"humidity":98}
				this.log("currentHeatingCoolingState is %s", json.currentHeatingCoolingState);
				this.currentHeatingCoolingState = json.currentHeatingCoolingState;
				this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, this.currentHeatingCoolingState);
				
				callback(null, this.currentHeatingCoolingState); // success
			} else {
				this.log("Error getting CurrentHeatingCoolingState: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	getTargetHeatingCoolingState: function(callback) {
		this.log("getTargetHeatingCoolingState from:", this.apiroute+"/status");
		request.get({
			url: this.apiroute+"/status",
			auth : this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{"targetHeatingCoolingState":3,"currentHeatingCoolingState":0,"targetTemperature":10,"temperature":12,"humidity":98}
				this.log("TargetHeatingCoolingState received is %s", json.targetHeatingCoolingState, json.targetStateCode);
				this.targetHeatingCoolingState = json.targetHeatingCoolingState !== undefined ? json.targetHeatingCoolingState : json.targetStateCode;
				this.log("TargetHeatingCoolingState is now %s", this.targetHeatingCoolingState);
				//this.service.setCharacteristic(Characteristic.TargetHeatingCoolingState, this.targetHeatingCoolingState);
				
				callback(null, this.targetHeatingCoolingState); // success
			} else {
				this.log("Error getting TargetHeatingCoolingState: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	setTargetHeatingCoolingState: function(value, callback) {
		if(value === undefined) {
			callback(); //Some stuff call this without value doing shit with the rest
		} else {
			this.log("setTargetHeatingCoolingState from/to:", this.targetHeatingCoolingState, value);
			
			request.get({
				url: this.apiroute + '/targetHeatingCoolingState/' + value,
				auth : this.auth
			}, function(err, response, body) {
				if (!err && response.statusCode == 200) {
					this.log("response success");
					//this.service.setCharacteristic(Characteristic.TargetHeatingCoolingState, value);
					this.targetHeatingCoolingState = value;
					callback(null); // success
				} else {
					this.log("Error setting TargetHeatingCoolingState: %s", err);
					callback(err);
				}
			}.bind(this));
		}
	},
	getCurrentTemperature: function(callback) {
		this.log("getCurrentTemperature from:", this.apiroute+"/status");
		request.get({
			url: this.apiroute+"/status",
			auth : this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{targetHeatingCoolingState":3,"currentHeatingCoolingState":0,"temperature":"18.10","humidity":"34.10"}

				if (json.currentTemperature != undefined)
                                {
                                  this.log("CurrentTemperature %s", json.currentTemperature);
                                  this.currentTemperature = parseFloat(json.currentTemperature);
                                }
                                else
                                {
                                  this.log("Temperature %s", json.temperature);
                                  this.currentTemperature = parseFloat(json.temperature);
                                }
								
				callback(null, this.currentTemperature); // success
			} else {
				this.log("Error getting CurrentTemperature: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	getTargetTemperature: function(callback) {
		this.log("getTargetTemperature from:", this.apiroute+"/status");
		request.get({
			url: this.apiroute+"/status",
			auth : this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{targetHeatingCoolingState":3,"currentHeatingCoolingState":0"currentTemperature":"18.10","humidity":"34.10"}
				this.targetTemperature = parseFloat(json.targetTemperature);
				this.heatingThresholdTemperature = parseFloat(json.heatingThresholdTemperature);
				this.log("Target temperature is %s", this.targetTemperature);
				callback(null, this.targetTemperature); // success
			} else {
				this.log("Error getting TargetTemperature: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	setTargetTemperature: function(value, callback) {
		this.log("setTargetTemperature from:", this.apiroute+"/targetTemperature/"+value);
		request.get({
			url: this.apiroute+"/targetTemperature/"+value,
			auth : this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				callback(null); // success
			} else {
				this.log("Error setting TargetTemperature: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	getTemperatureDisplayUnits: function(callback) {
		this.log("getTemperatureDisplayUnits:", this.temperatureDisplayUnits);
		var error = null;
		callback(error, this.temperatureDisplayUnits);
	},
	setTemperatureDisplayUnits: function(value, callback) {
		this.log("setTemperatureDisplayUnits from %s to %s", this.temperatureDisplayUnits, value);
		this.temperatureDisplayUnits = value;
		var error = null;
		callback(error);
	},

	// Optional
	getCurrentRelativeHumidity: function(callback) {
		this.log("getCurrentRelativeHumidity from:", this.apiroute+"/status");
		request.get({
			url: this.apiroute+"/status",
			auth : this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{"state":"OFF","targetStateCode":5,"temperature":"18.10","humidity":"34.10"}
				
				if (json.currentRelativeHumidity != undefined)
                                {
                                  this.log("Humidity state is %s", json.currentRelativeHumidity);
                                  this.currentRelativeHumidity = parseFloat(json.currentRelativeHumidity);
                                }
                                else
                                {
                                  this.log("Humidity %s", json.humidity);
                                  this.currentRelativeHumidity = parseFloat(json.humidity);
                                }

				callback(null, this.currentRelativeHumidity); // success
			} else {
				this.log("Error getting CurrentRelativeHumidity: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	getTargetRelativeHumidity: function(callback) {
		this.log("getTargetRelativeHumidity:", this.targetRelativeHumidity);
		var error = null;
		callback(error, this.targetRelativeHumidity);
	},
	setTargetRelativeHumidity: function(value, callback) {
		this.log("setTargetRelativeHumidity from/to :", this.targetRelativeHumidity, value);
		this.log("setTargetRelativeHumidity not implemented with API");
		this.targetRelativeHumidity = value;
		var error = null;
		callback(error);
	},
/*	getCoolingThresholdTemperature: function(callback) {
		this.log("getCoolingThresholdTemperature: ", this.coolingThresholdTemperature);
		var error = null;
		callback(error, this.coolingThresholdTemperature);
	},
*/	getHeatingThresholdTemperature: function(callback) {
		this.log("getHeatingThresholdTemperature from:", this.apiroute+"/status");
		request.get({
			url: this.apiroute+"/status",
			auth : this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{"state":"OFF","targetStateCode":5,"temperature":"18.10","heatingThresholdTemperature":"21.00"}
				
				if (json.heatingThresholdTemperature != undefined)
                                {
                                  this.log("Heating threshold temperature is %s", json.heatingThresholdTemperature);
                                  this.heatingThresholdTemperature = parseFloat(json.heatingThresholdTemperature);
                                }
                                else
                                {
                                  this.log("Heating threshold temperature is %s", json.heatingThresholdTemperature);
                                  this.heatingThresholdTemperature = parseFloat(json.heatingThresholdTemperature);
                                }

				callback(null, this.heatingThresholdTemperature); // success
			} else {
				this.log("Error getting HeatingThresholdTemperature: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	getName: function(callback) {
		this.log("getName :", this.name);
		var error = null;
		callback(error, this.name);
	},

	getBatteryLevel: function(callback) {
		this.log("getBatteryLevel from:", this.apiroute+"/status");
		request.get({
			url: this.apiroute+"/status",
			auth : this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{targetHeatingCoolingState":3,"currentHeatingCoolingState":0,"temperature":"18.10","humidity":"34.10"}

				if (json.batteryLevel != undefined)
                                {
                                  this.log("BatteryLevel %s", json.batteryLevel);
                                  this.batteryLevel = parseInt(json.batteryLevel);
                                }
                                else
                                {
                                  this.log("BatteryLevel undefined");
                                  this.batteryLevel = parseInt(0);
				  this.batteryService = null;
				  callback(null);
                                }

				callback(null, this.batteryLevel); // success
			} else {
				this.log("Error getting BatteryLevel: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	
	getStatusLowBattery: function(callback) {
		this.log("getStatusLowBattery from:", this.apiroute+"/status");
		request.get({
			url: this.apiroute+"/status",
			auth : this.auth
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{targetHeatingCoolingState":3,"currentHeatingCoolingState":0,"temperature":"18.10","humidity":"34.10"}

				if (json.statusLowBattery != undefined)
                                {
                                  this.log("StatusLowBattery %s", json.statusLowBattery);
                                  this.batteryLevel = parseInt(json.statusLowBattery);
                                }
                                else
                                {
                                  this.log("StatusLowBattery undefined");
                                  this.batteryLevel = parseInt(0);
				  this.batteryService = null;
				  callback(null);
                                }

				callback(null, this.statusLowBattery); // success
			} else {
				this.log("Error getting StatusLowBattery: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	
	getServices: function() {

		// Required Characteristics
		this.thermostatService
			.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
			.on('get', this.getCurrentHeatingCoolingState.bind(this));

		this.thermostatService
			.getCharacteristic(Characteristic.TargetHeatingCoolingState)
			.on('get', this.getTargetHeatingCoolingState.bind(this))
			.on('set', this.setTargetHeatingCoolingState.bind(this));

		this.thermostatService
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getCurrentTemperature.bind(this));

		this.thermostatService
			.getCharacteristic(Characteristic.TargetTemperature)
			.on('get', this.getTargetTemperature.bind(this))
			.on('set', this.setTargetTemperature.bind(this));

		this.thermostatService
			.getCharacteristic(Characteristic.TemperatureDisplayUnits)
			.on('get', this.getTemperatureDisplayUnits.bind(this))
			.on('set', this.setTemperatureDisplayUnits.bind(this));

		// Optional Characteristics
		this.thermostatService
			.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.on('get', this.getCurrentRelativeHumidity.bind(this));

		this.thermostatService
			.getCharacteristic(Characteristic.TargetRelativeHumidity)
			.on('get', this.getTargetRelativeHumidity.bind(this))
			.on('set', this.setTargetRelativeHumidity.bind(this));
		/*
		this.thermostatService
			.getCharacteristic(Characteristic.CoolingThresholdTemperature)
			.on('get', this.getCoolingThresholdTemperature.bind(this));
		*/

		this.thermostatService
			.getCharacteristic(Characteristic.HeatingThresholdTemperature)
			.on('get', this.getHeatingThresholdTemperature.bind(this));

		this.thermostatService
			.getCharacteristic(Characteristic.Name)
			.on('get', this.getName.bind(this));
		
		this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				minValue: this.minTemp,
				maxValue: this.maxTemp,
				minStep: 1
			});
		this.thermostatService.getCharacteristic(Characteristic.TargetTemperature)
			.setProps({
				minValue: this.minTemp,
				maxValue: this.maxTemp,
				minStep: 1
			});
		//this.log(this.minTemp);
		
		//Battery Service
		this.batteryService = new Service.BatteryService();
		this.batteryService
			//The value property of BatteryLevel must be an integer representing a percentage:
			.setCharacteristic(Characteristic.BatteryLevel, this.batteryLevel)
			//The value property of ChargingState must be one of the following:
			//Characteristic.ChargingState.NOT_CHARGING = 0;
			//Characteristic.ChargingState.CHARGING = 1;
			//Characteristic.ChargingState.NOT_CHARGEABLE = 2;
			.setCharacteristic(Characteristic.ChargingState, this.chargingState)
			//The value property of StatusLowBattery must be one of the following:
			//Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL = 0;
			//Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW = 1;
			.setCharacteristic(Characteristic.StatusLowBattery, this.statusLowBattery);
		this.log("Battery level: %s", this.batteryLevel);
		this.log("Charging state: %s", this.chargingState);
		this.log("Status low battery: %s", this.statusLowBattery);
		
		this.batteryService
			.getCharacteristic(Characteristic.BatteryLevel)
			.on('get', this.getBatteryLevel.bind(this));
		
		this.batteryService
			.getCharacteristic(Characteristic.StatusLowBattery)
			.on('get', this.getStatusLowBattery.bind(this));
	  	  
		
		//Information Service
		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serialnumber)
			.setCharacteristic(Characteristic.FirmwareRevision, this.firmware)
			.setCharacteristic(Characteristic.HardwareRevision, this.hardware);
		
		return [this.informationService, this.batteryService, this.thermostatService];
	}
};
