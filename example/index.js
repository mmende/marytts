var mary = require('./../')('localhost', 59125);

mary.process('Hello World', {base64: true}, function(audio){
	console.log('Audio', audio.substr(0, 50) + '...');
});

var words = ['this', 'is', 'a', 'test'];
mary.phonemes(words, 'en_US', 'cmu-slt-hsmm', function(t){
	console.log('Phonemes', t);
});

mary.voices(function(voices){
	console.log('Voices', voices);
});