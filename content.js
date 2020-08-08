chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    const HOTKEY_LEFT_PEDAL = 'hotkey_left_pedal';
    const HOTKEY_RIGHT_PEDAL = 'hotkey_1';

    const speechRecognizer = new webkitSpeechRecognition();
    speechRecognizer.continuous = true;
    speechRecognizer.interimResults = true;
    speechRecognizer.lang = 'en-US';
    speechRecognizer.start();

    let accessToken = '';

    const songTitles = [];

    function login (spotifyClientId, spotifyClientSecret) {
        const formData = new FormData();
        formData.append('grant_type', 'client_credentials');

        return fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(`${spotifyClientId}:${spotifyClientSecret}`)
            },
            body: 'grant_type=client_credentials',
        })
        .then(response => response.json())
        .then(responseJSON => accessToken = responseJSON.access_token);
    }

    chrome.storage.sync.get(['spotifyClientId', 'spotifyClientSecret'], ({spotifyClientId, spotifyClientSecret}) => {
        login(spotifyClientId, spotifyClientSecret);
    });

    function search (query) {
        const encodedQuery = encodeURIComponent(query);

        fetch(`https://api.spotify.com/v1/search?type=track&q=${encodedQuery}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => response.json())
        .then(data => console.log(data));
    }

    speechRecognizer.onresult = function (event) {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i][0].transcript;

            if (transcript.trim() === 'new song') {
                const songTitle = event.results[i - 1][0].transcript.trim();

                songTitles.push(songTitle);

                search(songTitle);

                console.log(`Adding: ${songTitle}`);
                console.log(`${songTitles.length} songs stored`, songTitles);
                break;
            }

            if (transcript.trim() === 'remove song') {
                if (songTitles.length) {
                    console.log(`Removing: "${songTitles.pop()}"`);
                } else {
                    console.log(`Cannot remove; no songs are stored"`);
                }
                break;
            }

            // if (event.results[i].isFinal) {
            //     finalTranscript += transcript;
            // } else {
            //     // interimTranscripts += transcript;
            //     finalTranscript += transcript;
            // }
        }
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
