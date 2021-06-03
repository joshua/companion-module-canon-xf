// Canon XF

var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.acid = '';
instance.prototype.authlevel = 'full';
instance.prototype.seq = 1;

instance.prototype.init = function () {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.request = require('request');
	
	self.status(self.STATUS_UNKNOWN);
	
	self.init_variables();
	self.init_connection();
};

instance.prototype.init_variables = function () {
	let self = this;
	
	let variables = [
		{
			label: 'Camera ID',
			name: 'camid'
		},
		{
			label: 'Battery Percent',
			name: 'battery_percent'
		},
		{
			label: 'Battery Remaining',
			name: 'battery_remaining'
		},
		{
			label: 'Full Auto',
			name: 'fullauto'
		},
		{
			label: 'Recording',
			name: 'rec'
		},
		{
			label: 'Recording Format',
			name: 'rec_fmt'
		},
		{
			label: 'Ext Recording',
			name: 'extrec'
		},
		{
			label: 'Timecode',
			name: 'tc'
		},
		{
			label: 'SD Card A State',
			name: 'sdcard_a_state'
		},
		{
			label: 'SD Card A Remaining',
			name: 'sdcard_a_remaining'
		},
		{
			label: 'SD Card B State',
			name: 'sdcard_b_state'
		},
		{
			label: 'SD Card B Remaining',
			name: 'sdcard_b_remaining'
		},
		{
			label: 'WB Mode',
			name: 'wb_mode'
		},
		{
			label: 'AWB Kelvin Value',
			name: 'awb_kelvinvalue'
		},
		{
			label: 'AWB CC Value',
			name: 'awb_ccvalue'
		},
		{
			label: 'Set A Kelvin Value',
			name: 'seta_kelvinvalue'
		},
		{
			label: 'Set A CC Value',
			name: 'seta_ccvalue'
		},
		{
			label: 'Set B Kelvin Value',
			name: 'setb_kelvinvalue'
		},
		{
			label: 'Set B CC Value',
			name: 'setb_ccvalue'
		},
		{
			label: 'Daylight Kelvin Value',
			name: 'daylight_kelvinvalue'
		},
		{
			label: 'Daylight CC Value',
			name: 'daylight_ccvalue'
		},
		{
			label: 'Tungsten Kelvin Value',
			name: 'tungsten_kelvinvalue'
		},
		{
			label: 'Tungsten CC Value',
			name: 'tungsten_ccvalue'
		},
		{
			label: 'Kelvin Value',
			name: 'kelvinvalue'
		},
		{
			label: 'Neutral Density',
			name: 'neutraldensity_value'
		},
		{
			label: 'Iris Mode',
			name: 'iris_mode'
		},
		{
			label: 'Iris Value',
			name: 'iris_value'
		},
		{
			label: 'ISO/Gain Mode',
			name: 'isogain_mode'
		},
		{
			label: 'ISO/Gain Value',
			name: 'isogain_value'
		},
		{
			label: 'Shutter Mode',
			name: 'shutter_mode'
		},
		{
			label: 'Shutter Step',
			name: 'shutter_step'
		},
		{
			label: 'Shutter Value',
			name: 'shutter_value'
		},
		{
			label: 'AE Shift',
			name: 'aeshift_value'
		},
		{
			label: 'AF Mode',
			name: 'afmode'
		},
		{
			label: 'Face Detection',
			name: 'facedetection'
		},
		{
			label: 'Focus Guide',
			name: 'focusguide'
		},
		{
			label: 'Zoom Speed',
			name: 'zoom_speed'
		},
		{
			label: 'Zoom Position',
			name: 'zoom_position'
		}
	];
	
	self.setVariableDefinitions(variables);
};

instance.prototype.init_connection = function () {
	let self = this;
	
	self.Login();
}

instance.prototype.Login = function() {
	let self = this;
	
	let url = `http://${self.config.username}:${self.config.password}@${self.config.host}/api/acnt/login`;

	self.request.get({ url: url }, function (error, response, body) {
		try {
			let jsonBody = JSON.parse(body);
			if (jsonBody.res === 'ok') {
				//grab the cookie data
				let cookies = response.headers['set-cookie'];
				try {
					let cookiesString = cookies.toString();
					let cookiesArray = cookiesString.split(';');
					
					for (let i = 0; i < cookiesArray.length; i++) {
						if (cookiesArray[i].indexOf('acid=') > -1) {
							//this is the acid we want
							let values = cookiesArray[i].split('=');
							self.acid = values[1];
						}
						else if (cookiesArray[i].indexOf('authlevel=') > -1) {
							//this is the auth level we need
							let value = cookiesArray[i].substring(cookiesArray[i].indexOf('authlevel=')+10);
							self.authlevel = value;
						}
					}
					
					if (self.acid !== '') {
						self.status(self.STATUS_OK);
						self.log('info', 'Session authenticated. ACID: ' + self.acid);
						self.GetUpdate();
					}
				} catch (error) {
					self.status(self.STATUS_ERROR, error);
				}
			}
			else if (jsonBody.res === 'errsession') {
				//someone else is logged in to the browser remote
				self.status(self.STATUS_ERROR);
				self.log('error', 'Session not authenticated. Is someone else using the Browser Remote? Retrying in 10 seconds...');
				setTimeout(self.Login.bind(self), 10000); //retry in 10 seconds
			}
			else {
				//something else we didn't catch
				self.log('info', jsonBody.res)
			}
		} catch (error) {
			console.log(error);
		}
	});	
};

instance.prototype.updateConfig = function (config) {
	var self = this;

	self.config = config;
	
	self.status(self.STATUS_UNKNOWN);
	
	self.init_variables();
	self.init_connection();
}

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will connect to a Canon XF Camera and allow you to control drive/lens parameters.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			width: 6,
			default: '192.168.11.226',
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'Username',
			width: 6,
			default: 'Full'
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Password',
			width: 6,
			default: '12345678'
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;
	debug("destroy", self.id);
};

instance.prototype.actions = function () {
	var self = this;

	self.system.emit('instance_actions', self.id, {

		'gain_up': {
			label: 'Gain Up'
		},
		'gain_down': {
			label: 'Gain Down'
		},
		'iris_up': {
			label: 'Iris Up'
		},
		'iris_down': {
			label: 'Iris Down'
		},
		'focus': {
			label: 'Set Focus Level',
			options: [
				{
					type: 'dropdown',
					id: 'level',
					default: 'near1',
					choices: [
						{ id: 'near1', label: 'Near 1'},
						{ id: 'near2', label: 'Near 2'},
						{ id: 'near3', label: 'Near 3'},
						{ id: 'far1', label: 'Far 1'},
						{ id: 'far2', label: 'Far 2'},
						{ id: 'far3', label: 'Far 3'}
					]
				}
			]
		},
		'trigger_rec': {
			label: 'Trigger Recording'
		},
		//SD Card Function to be tested.
		'select_sd' : {
			label: 'Select SD Card'
		},
		'push_auto_iris' : {
			label: 'Push Auto Iris'
		},
		'auto_iris' : {
			label: 'Auto Iris Mode'
		},
		'manual_iris' : {
			label: 'Manual Iris Mode'
		},
		'face_detection_focus' : {
			label: 'Face Detection Focus'
		},
		'zoom_preset' : {
			label: 'Zoom to preset location',
			options: [
				{
					type: 'dropdown',
					id: 'level',
					default: '1',
					choices: [
						{ id: '1', label: 'Preset 1'},
						{ id: '2', label: 'Preset 2'},
						{ id: '3', label: 'Preset 3'},
						{ id: '4', label: 'Preset 4'},
						{ id: '5', label: 'Preset 5'},
						{ id: '6', label: 'Preset 6'}
					]
				}
			]
		},
		'check_mark_clip' : {
			label: 'Check Mark Clip' 
		},
		'mark_clip' : {
			label: 'OK Mark Clip'
		},
		'manual_focus_enable' : {
			label: 'Enable Manual Focus'
		},
		'automatic_focus_enable' : {
			label: 'Enable Automatic Focus'
		},
		'shutter_mode' : {
			label: 'Select Shutter Function',
			options: [
				{
					type: 'dropdown',
					id: 'function',
					default: 'off',
					choices: [
						{ id: 'slow', label: 'Slow Shutter Mode'},
						{ id: 'clear', label: 'Clearn Scan Shutter Mode'},
						{ id: 'angle', label: 'Angle Shutter Mode'},
						{ id: 'speed', label: 'Speed Shutter Mode'},
						{ id: 'auto', label: 'Auto Shutter Mode'},
						{ id: 'off', label: 'Disable Shutter Mode'},
						{ id: 'fine', label: 'Fine Shutter Mode'},
						{ id: 'normal', label: 'Normal Shutter Mode'}
					]
				}
			]
		},
		'nd_mode' : {
			label: 'Select ND Function',
			options: [
				{
					type: 'dropdown',
					id: 'function',
					default: 'off',
					choices: [
						{id: 'off', label: 'ND Off'},
						{id: 'up', label: 'ND Up'},
						{id: 'down', label: 'ND Down'},
						{id: '1/4', label: 'ND 1/4'},
						{id: '1/16', label: 'ND 1/16'},
						{id: '1/64', label: 'ND 1/64'}
					]
				}
			]
	},
		'full_auto_enable' : {
			label: 'Enable Full Auto'
		},
		'full_auto_disable' : {
			label: 'Disable Full Auto'
		},
		'awb' : {
			label: 'Auto White Balance'
		},
		'awb_lock' : {
			label: 'Auto White Balance Lock'
		},
		'set_awbcustom_1' : {
			label: 'Set AWB Custom 1'
		},
		'set_awbcustom_2' : {
			label: 'Set AWB Custom 2'
		},
		'set_colortemp' : {
			label: 'Set Color Temp',
			options: [
				{
					type: 'dropdown',
					id: 'type',
					default: 'tungsten',
					choices: [
						{id: 'tungsten', label: 'Tungsten - 2940k'},
						{id: 'kelvin', label: 'Kelvin - 5600k'},
						{id: 'daylight', label: 'Daylight - 5600k'},
					]
				}
			]
		
		
		},
		'logout': {
			label: 'Logout of the Browser Remote Session'
		},
		'login': {
			label: 'Login to the Browser Remote Session'
		}
	});
};

instance.prototype.action = function (action) {
	var self = this;
	var cmd;
	var options = action.options;

	switch (action.action) {
		case 'gain_up':
			cmd = '/api/cam/drivelens?gain=plus';
			//self.ControlCamera('drivelens', 'gain', 'plus'); //method, function, property
			break;
		case 'gain_down':
			cmd = '/api/cam/drivelens?gain=minus';
			break;
		case 'iris_up':
			cmd = '/api/cam/drivelens?iris=plus';
			break;
		case 'iris_down':
			cmd = '/api/cam/drivelens?iris=minus';
			break;
		case 'focus':
			cmd = '/api/cam/drivelens?fl=' + options.level;
			break;
			
		case 'logout':
			self.Logout();
			break;
		case 'login':
			self.Login();
			break;
	}

	if (cmd !== undefined) {
		let url = `http://${self.config.host}${cmd}`;

		if (self.acid !== '') {
			let cookieJarAuth = self.request.jar();
			let cookie1 = self.request.cookie('acid=' + self.acid);
			let cookie2 = self.request.cookie('authlevel=' + self.authlevel);
			let cookie3 = self.request.cookie('productId=VOAX00');
			let cookie4 = self.request.cookie('brlang=0');
			cookieJarAuth.setCookie(cookie1, url);
			cookieJarAuth.setCookie(cookie2, url);
			cookieJarAuth.setCookie(cookie3, url);
			cookieJarAuth.setCookie(cookie4, url);

			self.request.get({ url: url, jar: cookieJarAuth }, function (error, response, body) {
				let jsonBody = JSON.parse(body);
				//console.log(jsonBody);
				if (jsonBody.res === 'ok') {
					//the command ran ok
				}
				else if (jsonBody.res === 'errsession') {
					//someone else is logged in to the browser remote
					self.status(self.STATUS_ERROR);
					self.log('error', 'Session not authenticated. Is someone else using the Browser Remote?');
				}
				else {
					//something else we didn't catch
					self.log('info', jsonBody.res)
				}
			});	
		}
		else {
			//invalid acid
			self.status(self.STATUS_ERROR);
			self.log('error', 'Session not authenticated.');
		}
	}
};

instance.prototype.GetUpdate = function () {
	let self = this;
	
	let cmd = `/api/cam/getcurprop?seq=${self.seq}`;
	
	let url = `http://${self.config.host}${cmd}`;

	if (self.acid !== '') {
		let cookieJarAuth = self.request.jar();
		let cookie1 = self.request.cookie('acid=' + self.acid);
		let cookie2 = self.request.cookie('authlevel=' + self.authlevel);
		let cookie3 = self.request.cookie('productId=VOAX00');
		let cookie4 = self.request.cookie('brlang=0');
		cookieJarAuth.setCookie(cookie1, url);
		cookieJarAuth.setCookie(cookie2, url);
		cookieJarAuth.setCookie(cookie3, url);
		cookieJarAuth.setCookie(cookie4, url);

		self.request.get({ url: url, jar: cookieJarAuth }, function (error, response, body) {
			try {
				let jsonBody = JSON.parse(body);
				if (jsonBody.res === 'ok') {
					//the command ran ok
					if (jsonBody.seq) {
						self.seq = jsonBody.seq;	
					}
					self.CheckData(jsonBody);
					setTimeout(self.GetUpdate.bind(self), 1000);
				}
				else if (jsonBody.res === 'errsession') {
					//someone else is logged in to the browser remote
					self.status(self.STATUS_ERROR, 'Session not authenticated. Is someone else using the Browser Remote?');
					self.Logout();
				}
				else if (jsonBody.res === 'busy') {
					//do something because it's in the busy state
					self.log('info', 'Unable to get status, the device is busy');
				}
				else {
					//something else we didn't catch
					self.log('info', jsonBody.res)
				}
			}
			catch(error) {
				self.status(self.STATUS_ERROR, 'Error getting updates: ' + error);
			}
		});	
	}
	else {
		//invalid acid
		self.status(self.STATUS_ERROR, 'Session not authenticated. Is someone else using the Browser Remote?');
	}
};

instance.prototype.CheckData = function(data) {
	console.log(data);
	let self = this;
	
	/*
	{"res":"ok","seq":1,"com":1,"mode":"ctrl","camid":"XF705   ","Opower":{"Obatt":{"percent":"non","rtime":"non"}},"rec":"off","extrec":"off","tc":"08:13:27.09","lvactfarea":"dci_80x80","Omedia":{"Osda":{"state":"n","rtime":-1,"select":0},"Osdb":{"state":"n","rtime":-1,"select":0}},"Owbinfo":{"Omode":{"pv":"tungsten","en":1},"Oawb":{"kelvinvalue":"--","ccvalue":"--","en":1},"Oseta":{"Ovalue":{"kelvinvalue":"5600","ccvalue":"0","en":1},"Osts":{"pv":"comp","en":1}},"Osetb":{"Ovalue":{"kelvinvalue":"5600","ccvalue":"0","en":1},"Osts":{"pv":"comp","en":1}},"Odaylight":{"kelvinvalue":"5600","ccvalue":"0","en":1},"Otungsten":{"kelvinvalue":"2940","ccvalue":"0","en":1},"Okelvin":{"kelvinvalue":"5600","ccvalue":"0","en":1},"Oawbhold":{"pv":"off","en":0},"propupdate":0},"Ondinfo":{"Ovalue":{"pv":"off","en":1},"adjen":1,"propupdate":0,"opedirection":"non"},"Oirisinfo":{"Omode":{"pv":"maniris","en":1},"Ovalue":{"pv":"F4.4","en":1},"Opushai":{"pv":"stop","en":1},"adjen":1,"Onumline":{"seg":3,"maxseg":15,"pos":127,"maxpos":254},"propupdate":0},"Oisogaininfo":{"Omode":{"pv":"mangain","en":1},"Ostep":{"pv":"normal","en":1},"Ovalue":{"pv":"15.0","en":1},"adjen":1,"propupdate":0},"Oshutterinfo":{"Omode":{"pv":"speed","en":1},"Ostep":{"pv":"normal","en":1},"Ovalue":{"pv":"1/75","en":1},"adjen":1,"propupdate":0},"Oaesinfo":{"Ovalue":{"pv":"--","en":0},"adjen":0,"propupdate":1},"Ofocusinfo":{"Oafmode":{"pv":"continuous","en":1},"Ofacedat":{"pv":"off","en":1},"Ofguide":{"pv":"off","en":1},"trctrlen":0,"tcctrlen":0,"Ofctrl":{"pv":"","en":1}},"Offrame":{"Oframeinfo":{"ftype":"non","farrowdisp":[0,0,0,0,0,0,0,0,0],"arrowsign":[0,0,0,0,0,0,0,0,0],"arrowangle":[0,0,0,0,0,0,0,0,0],"color":[0,0,0,0,0,0,0,0,0],"width":[0,0,0,0,0,0,0,0,0],"height":[0,0,0,0,0,0,0,0,0],"xcoord":[0,0,0,0,0,0,0,0,0],"ycoord":[0,0,0,0,0,0,0,0,0]},"Ofguideframeinfo":{"ftype":"non","farrowdisp":[0,0,0,0,0,0,0,0,0],"arrowsign":[0,0,0,0,0,0,0,0,0],"arrowangle":[0,0,0,0,0,0,0,0,0],"color":[0,0,0,0,0,0,0,0,0],"width":[0,0,0,0,0,0,0,0,0],"height":[0,0,0,0,0,0,0,0,0],"xcoord":[0,0,0,0,0,0,0,0,0],"ycoord":[0,0,0,0,0,0,0,0,0]}},"Ometa":{"metamode":"ctrl","metaclip":[""]},"Ozoom":{"speed":2,"pos":47,"status":"stop"},"recfmt":"hevc","irmode":"off","Ofullauto":{"pv":"off","en":1,"propupdate":0}}

	*/
	try {
		if (data['camid']) {
			self.setVariable('camid', data['camid']);
		}
		if (data['Opower'] && data['Opower']['Obatt'] && data['Opower']['Obatt']['percent']) {
			self.setVariable('battery_percent', data['Opower']['Obatt']['percent']);
		}

		if (data['Opower'] && data['Opower']['Obatt'] && data['Opower']['Obatt']['rtime']) {
			self.setVariable('battery_remaining', data['Opower']['Obatt']['rtime']);
		}

		if (data['Ofullauto'] && data['Ofullauto']['pv']) {			
			self.setVariable('fullauto', data['Ofullauto']['pv']);
		}

		if (data['rec']) {
			self.setVariable('rec', data['rec']);
		}

		if (data['recfmt']) {
			self.setVariable('rec_fmt', data['recfmt']);
		}

		if (data['extrec']) {
			self.setVariable('extrec', data['extrec']);
		}

		if (data['tc']) {
			self.setVariable('tc', data['tc']);
		}

		if (data['Omedia'] && data['Omedia']['Osda'] && data['Omedia']['Osda']['state']) {
			self.setVariable('sdcard_a_state', data['Omedia']['Osda']['state']);
		}

		if (data['Omedia'] && data['Omedia']['Osda'] && data['Omedia']['Osda']['rtime']) {
			self.setVariable('sdcard_a_remaining', data['Omedia']['Osda']['rtime']);
		}

		if (data['Omedia'] && data['Omedia']['Osdb'] && data['Omedia']['Osdb']['state']) {
			self.setVariable('sdcard_b_state', data['Omedia']['Osdb']['state']);
		}

		if (data['Omedia'] && data['Omedia']['Osdb'] && data['Omedia']['Osdb']['rtime']) {
			self.setVariable('sdcard_b_remaining', data['Omedia']['Osdb']['rtime']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Omode'] && data['Owbinfo']['Omode']['pv']) {
			self.setVariable('wb_mode', data['Owbinfo']['Omode']['pv']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Oawb'] && data['Owbinfo']['Oawb']['kelvinvalue']) {
			self.setVariable('awb_kelvinvalue', data['Owbinfo']['Oawb']['kelvinvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Oawb'] && data['Owbinfo']['Oawb']['ccvalue']) {
			self.setVariable('awb_ccvalue', data['Owbinfo']['Oawb']['ccvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Oseta'] && data['Owbinfo']['Oseta']['Ovalue']['kelvinvalue']) {
			self.setVariable('seta_kelvinvalue', data['Owbinfo']['Oseta']['Ovalue']['kelvinvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Oseta'] && data['Owbinfo']['Oseta']['Ovalue']['ccvalue']) {
			self.setVariable('seta_ccvalue', data['Owbinfo']['Oseta']['Ovalue']['ccvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Osetb'] && data['Owbinfo']['Osetb']['Ovalue']['kelvinvalue']) {
			self.setVariable('setb_kelvinvalue', data['Owbinfo']['Osetb']['Ovalue']['kelvinvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Osetb'] && data['Owbinfo']['Osetb']['Ovalue']['ccvalue']) {
			self.setVariable('setb_ccvalue', data['Owbinfo']['Osetb']['Ovalue']['ccvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Odaylight'] && data['Owbinfo']['Odaylight']['kelvinvalue']) {
			self.setVariable('daylight_kelvinvalue', data['Owbinfo']['Odaylight']['kelvinvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Odaylight'] && data['Owbinfo']['Odaylight']['ccvalue']) {
			self.setVariable('daylight_ccvalue', data['Owbinfo']['Odaylight']['ccvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Otungsten'] && data['Owbinfo']['Otungsten']['kelvinvalue']) {
			self.setVariable('tungsten_kelvinvalue', data['Owbinfo']['Otungsten']['kelvinvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Otungsten'] && data['Owbinfo']['Otungsten']['ccvalue']) {
			self.setVariable('tungsten_ccvalue', data['Owbinfo']['Otungsten']['ccvalue']);
		}

		if (data['Owbinfo'] && data['Owbinfo']['Okelvin'] && data['Owbinfo']['Okelvin']['kelvinvalue']) {
			self.setVariable('kelvinvalue', data['Owbinfo']['Okelvin']['kelvinvalue']);
		}

		if (data['Ondinfo'] && data['Ondinfo']['Ovalue'] && data['Ondinfo']['Ovalue']['pv']) {
			self.setVariable('neutraldensity_value', data['Ondinfo']['Ovalue']['pv']);
		}

		if (data['Oirisinfo'] && data['Oirisinfo']['Omode'] && data['Oirisinfo']['Omode']['pv']) {
			self.setVariable('iris_mode', data['Oirisinfo']['Omode']['pv']);
		}

		if (data['Oirisinfo'] && data['Oirisinfo']['Ovalue'] && data['Oirisinfo']['Ovalue']['pv']) {
			self.setVariable('iris_value', data['Oirisinfo']['Ovalue']['pv']);
		}

		if (data['Oisogaininfo'] && data['Oisogaininfo']['Omode'] && data['Oisogaininfo']['Omode']['pv']) {
			self.setVariable('isogain_mode', data['Oisogaininfo']['Omode']['pv']);
		}

		if (data['Oisogaininfo'] && data['Oisogaininfo']['Ovalue'] && data['Oisogaininfo']['Ovalue']['pv']) {
			self.setVariable('isogain_value', data['Oisogaininfo']['Ovalue']['pv']);
		}

		if (data['Oshutterinfo'] && data['Oshutterinfo']['Omode'] && data['Oshutterinfo']['Omode']['pv']) {
			self.setVariable('shutter_mode', data['Oshutterinfo']['Omode']['pv']);
		}

		if (data['Oshutterinfo'] && data['Oshutterinfo']['Ostep'] && data['Oshutterinfo']['Ostep']['pv']) {
			self.setVariable('shutter_step', data['Oshutterinfo']['Ostep']['pv']);
		}

		if (data['Oshutterinfo'] && data['Oshutterinfo']['Ovalue'] && data['Oshutterinfo']['Ovalue']['pv']) {
			self.setVariable('shutter_value', data['Oshutterinfo']['Ovalue']['pv']);
		}

		if (data['Oaesinfo'] && data['Oaesinfo']['Ovalue'] && data['Oaesinfo']['Ovalue']['pv']) {
			self.setVariable('aeshift_value', data['Oaesinfo']['Ovalue']['pv']);
		}

		if (data['Ofocusinfo'] && data['Ofocusinfo']['Oafmode'] && data['Ofocusinfo']['Oafmode']['pv']) {
			self.setVariable('afmode', data['Ofocusinfo']['Oafmode']['pv']);
		}

		if (data['Ofocusinfo'] && data['Ofocusinfo']['Ofacedat'] && data['Ofocusinfo']['Ofacedat']['pv']) {
			self.setVariable('facedetection', data['Ofocusinfo']['Ofacedat']['pv']);
		}

		if (data['Ofocusinfo'] && data['Ofocusinfo']['Ofguide'] && data['Ofocusinfo']['Ofguide']['pv']) {
			self.setVariable('focusguide', data['Ofocusinfo']['Ofguide']['pv']);
		}

		if (data['Ozoom'] && data['Ozoom']['speed']) {
			self.setVariable('zoom_speed', data['Ozoom']['speed']);
		}

		if (data['Ozoom'] && data['Ozoom']['pos']) {
			self.setVariable('zoom_position', data['Ozoom']['pos']);
		}
	}
	catch(error) {
		console.log('Error processing data: ' + error);
	}
};

instance.prototype.Logout = function () {
	let self = this;
	
	self.acid = '';
	self.authlevel = '';
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;