chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    const HOTKEY_LEFT_PEDAL = 'hotkey_left_pedal';
    const HOTKEY_RIGHT_PEDAL = 'hotkey_1';

    // this one works!
    var speechRecognizer = new webkitSpeechRecognition();
    speechRecognizer.continuous = true;
    speechRecognizer.interimResults = true;
    speechRecognizer.lang = 'en-US';
    speechRecognizer.start();

    var finalTranscripts = '';

    speechRecognizer.onresult = function (event) {
        var interimTranscripts = '';

        for (var i = event.resultIndex; i < event.results.length; i += 1) {
            var transcript = event.results[i][0].transcript;
            transcript.replace("\n", "<br>");

            if (event.results[i].isFinal) {
                finalTranscripts += transcript;
            } else {
                interimTranscripts += transcript;
            }
        }

        console.log(finalTranscripts + interimTranscripts);
    };
    speechRecognizer.onerror = function (event) {
        alert('Something fucked up');
    };

    if (msg.text === HOTKEY_LEFT_PEDAL) {
        console.log('yup', msg.text);
        sendResponse('success');
    } else if (msg.text === HOTKEY_RIGHT_PEDAL) {
        console.log('yup', msg.text);
        sendResponse('success');
    }
});
