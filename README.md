# MaryTTS for Node.js

This module allows simple interaction with a MaryTTS server. It allows generate wav audio as base64 so that it can easily be placed in the source attribute of a browser. Furthermore all input and output types are available.

## Prerequisites

The module requires a MaryTTS server running. The only thing to do therefore is to download the MaryTTS runtime package **[here](http://mary.dfki.de)** and run the `marytts-server` script in the bin directory.

## Example

```javascript
var mary = require('marytts')('localhost', 59125);

// Which voices are installed
mary.voices(function(voices){
    console.log('Installed voices', voices);
});

// Generate an audio
mary.process('Hello World', {base64: true}, function(audio){
    console.log('The base64 audio', audio);
});

// Lookup phonetic transcriptions, the transcription method and part of speech
var words = ['how', 'to', 'pronounce', 'this'];
mary.phonemes(words, 'en', 'cmu-slt-hsmm', function(phonemes){
    console.log('Phonemes', phonemes);
});

```

## Options

To adjust the e.g. the input type it is possible to pass some options as second parameter. This is the list of currently supported options:

Option      | Description
------------|------------
inputType   | The data type of the input text.
outputType  | The data type to be generated as output.
locale      | The locale of the input text.
voice       | The voice to use for generating output.
audio       | If outputType = audio the format in which to send the synthesized audio.
base64      | If the returned audio should be returned as base64 string or buffer

## Methods

The following Methods are available:

* `process(text, [options], callback)` - Processes the text and assigns the result to the callback
* `phonemes(words, locale, voice, callback)` - Assigns the phonetic transcription, the method for transcription and part of speech to the callback
* `voices(callback)` - Assigns all installed voices (with their locale, gender and type) to the callback
* `locales(callback)` - Assigns all installed locales to the callback
* `inputTypes(callback):Array` - Assigns all available input types to callback and returns them
* `outputTypes(callback):Array` - Assigns all available output types to callback and returns them
* `audioFormats(callback):Array` - Assigns all available audio formats to callback and returns them
