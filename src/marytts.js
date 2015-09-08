var request = require('request'),
	parseString = require('xml2js').parseString,
	fs = require('fs');


module.exports = function(host, port) {

	/** @type {Object} The available InputTypes **/
	var InputTypes = {
		text: 1,
		simplephonemes: 2,
		sable: 3,
		ssml: 4,
		apml: 5,
		emotionml: 6,
		rawmaryxml: 7,
		tokens: 8,
		words: 9,
		partsofspeech: 10,
		phonemes: 11,
		intonation: 12,
		allophones: 13,
		acoustparams: 14
	};

	/** @type {Object} The available OutputTypes **/
	var OutputTypes = {
		rawmaryxml: 1,
		tokens: 2,
		words: 3,
		partsofspeech: 4,
		phonemes: 5,
		intonation: 6,
		allophones: 7,
		acoustparams: 8,
		targetfeatures: 9,
		audio: 10,
		halfphone_targetfeatures: 11,
		realised_acoustparams: 12,
		realised_durations: 13,
		praat_textgrid: 14
	};

	/** @type {Object} The available AudioFormats **/
	var AudioFormats = {
		wave_file: 1,
		au_file: 2,
		aiff_file: 3
	}

	// Create the url from host and port
	var host = host || 'localhost',
		port = port || 59125,
		_url = host + ':' + port + '/';
	var re = /^https?:\/\//;
	_url = re.test(_url) ? _url : 'http://' + _url;

	/**
	 * Processes text as in maryTTS
	 *
	 * @param  {string}   text     A text to process
	 * @param  {Object}   options  The options for the processing
	 * @param  {Function} callback A callback function
	 */
	function _process(text, options, callback) {

		// If options are not provided let's hope the second parameter is the callback function
		callback = typeof(options) === 'function' ? options : callback;
		options = typeof(options) === 'object' ? options : {};

		// Create the data to transmit
		var data = [];
		data['INPUT_TEXT'] = text;
		data['INPUT_TYPE'] = (!('inputType' in options) || !(options.inputType in InputTypes)) ? 'TEXT' : options.inputType.toUpperCase();
		data['OUTPUT_TYPE'] = (!('outputType' in options) || !(options.outputType in OutputTypes)) ? 'AUDIO' : options.outputType.toUpperCase();
		data['LOCALE'] = (!('locale' in options)) ? 'en_US' : options.locale;
		data['AUDIO'] = (!('audio' in options) || !(options.audio in AudioFormats)) ? 'WAVE_FILE' : options.audio.toUpperCase();

		if('voice' in options && options.voice.length > 0) data['VOICE'] = options.voice;
		
		request(
			{
				url: _url + 'process',
				method: 'POST',
				form: data,
				encoding: data['OUTPUT_TYPE']==='AUDIO' ? null : 'utf8'
			},
			function (error, response, body) {
				if(error) {
					console.error(error);
					return;
				}
				//console.log(response);
				if (response.statusCode == 200) {
					if(data['OUTPUT_TYPE']==='AUDIO') {
						var audioBuffer = new Buffer(body);
						if(('base64' in options) && options.base64 === true) {
							var format = response.headers['content-type'];
							var base54Audio = 'data:' + format + ';base64,' + audioBuffer.toString('base64');
							callback(base54Audio);
						} else {
							callback(audioBuffer);
						}
					} else {
						callback(body);
						//console.log(body);
					}
				} else {
					console.error(response.statusCode + ': ' + response.statusMessage);
				}
			}
		);
	}//-_process

	/**
	 * Returns the phonetic transcription, the method to create the transcriptions and the part of speech for an array of words.
	 *
	 * @param  {array}    words    An array of words
	 * @param  {string}   locale   A valid locale to use for the transcriptions
	 * @param  {string}   voice    A valid voice to use for the transcriptions
	 * @param  {Function} callback A callback function.
	 */
	function _phonemes(words, locale, voice, callback) {
		var _t = {};
		for (var i = words.length - 1; i >= 0; i--) {
			_t[words[i]] = {
				phonemes: false,
				method: 'unknown',
				partOfSpeech: 'unknown'
			}
		}

		var text = words.join(' ');
		var options = {
			inputType: 'text',
			outputType: 'phonemes',
			voice: voice,
			locale: locale
		};
		var xml = _process(text, options, function(xml){
			parseString(xml, function (err, result) {
				if(err) {
					console.error(err);
					callback(_t);
					return;
				}

				if(!('maryxml' in result) || !('p' in result.maryxml) || result.maryxml.p.length < 1) {
					callback(_t);
					return;
				}

				var t_node = result.maryxml.p[0];
				if(('voice' in t_node) && t_node.voice.length > 0) {
					t_node = t_node.voice[0];
				}
				if(!('s' in t_node) || t_node.s.length < 1) {
					callback(_t);
					return;
				}
				t_node = t_node.s[0];
				if(!('t' in t_node)) {
					callback(_t);
					return;
				}
				t_node = t_node.t;
				
				for (var i = t_node.length - 1; i >= 0; i--) {
					var node = t_node[i],
						token = node._.trim();
						relevant = token in _t;

					if(relevant) {
						_t[token].phonemes = node.$.ph;
						_t[token].method = node.$.g2p_method;
						_t[token].partOfSpeech = node.$.pos;
					}
				};
				callback(_t);
			});
		});
	}

	/**
	 * Requests all available voices.
	 *
	 * @param  {Function} callback A callback function.
	 */
	function _voices(callback) {
		request(_url + 'voices',
			function(error, response, body) {
				var rawVoices = body.split('\n'),
					voices = {},
					j = 0;
				for (var i = rawVoices.length - 1; i >= 0; i--) {
					var voice = rawVoices[i];
					if(voice.length > 0) {
						var voiceParams = voice.split(' ');
						voices[voiceParams[0]] = {
							'locale': voiceParams[1],
							'gender': voiceParams[2],
							'type': voiceParams[3]
						}
					}
				};
				callback(voices);
			}
		);
	}

	/**
	 * Requests all available voices
	 *
	 * @param  {Function} callback A callback function
	 */
	function _locales(callback) {
		request(_url + 'locales',
			function(error, response, body) {
				var locales = [];
				if(error) {
					console.error(error);
					callback([]);
				}
				var rawLocales = body.split('\n');
				for(var i = 0; i < rawLocales.length; ++i)
					if(rawLocales[i].length > 0) locales.push(rawLocales[i]);
				callback(locales);
			}
		);
	}

	/**
	 * The public methods.
	 */
	return {
		/**
		 * Processes text with MaryTTS
		 *
		 * @param  {string}   text     The string to process
		 * @param  {Object}   options  The options to use
		 * @param  {Function} callback A callback function
		 */
		process: function(text, options, callback) {
			_process(text, options, callback);
		},
		/**
		 * Gets the phonetic description, part of speech and transcription method for an array of words
		 *
		 * @param  {Array}    words    The words to transcribe
		 * @param  {string}   locale   The locale to use
		 * @param  {string}   voice    The voice to use
		 * @param  {Function} callback A callback function
		 */
		phonemes: function(words, locale, voice, callback) {
			_phonemes(words, locale, voice, callback);
		},
		/**
		 * Gets all available voices
		 *
		 * @param  {Function} callback A callback function
		 */
		voices: function(callback) {
			_voices(callback);
		},
		/**
		 * Gets all available locales
		 *
		 * @param  {Function} callback A callback function
		 */
		locales: function(callback) {
			_locales(callback);
		},
		/**
		 * Gets all available input types
		 *
		 * @param  {Function} callback A callback function
		 *
		 * @return {Array}           The input types
		 */
		inputTypes: function(callback) {
			var types = [];
			for(var key in InputTypes)
				types.push(key);
			if(typeof(callback)==='function') callback(types);
			return types;
		},
		/**
		 * Gets all available output types
		 *
		 * @param  {Function} callback A callback function
		 *
		 * @return {Array}           The output types
		 */
		outputTypes: function(callback) {
			var types = [];
			for(var key in OutputTypes)
				types.push(key);
			if(typeof(callback)==='function') callback(types);
			return types;
		},
		/**
		 * Gets all available audio formats
		 *
		 * @param  {Function} callback A callback function
		 *
		 * @return {Array}            The audio formats
		 */
		audioFormats: function(callback) {
			var formats = [];
			for(var key in AudioFormats)
				formats.push(key);
			if(typeof(callback)==='function') callback(formats);
			return formats;
		}
	};
};

