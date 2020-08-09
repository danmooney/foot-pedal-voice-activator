chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    const HOTKEY_LEFT_PEDAL = 'hotkey_left_pedal';
    const HOTKEY_RIGHT_PEDAL = 'hotkey_1';

    const censoredRegexToUncensoredWordMap = {
        'b[*]{4}(?!\\*)': 'bitch',
        'f[*]{3}(?!\\*)': 'fuck',
        's[*]{3}(?!\\*)': 'shit',
    };

    function startListeningAndAdding () {
        const speechRecognizer = new webkitSpeechRecognition();
        speechRecognizer.continuous = true;
        speechRecognizer.interimResults = true;
        speechRecognizer.lang = 'en-US';
        speechRecognizer.start({
            filterProfanities: false // TODO - does not work - https://stackoverflow.com/questions/28399616/
        });

        let accessToken = '';

        const songTitleIdentifierMap = [];

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

        chrome.storage.local.get(
            ['spotifyClientId', 'spotifyClientSecret'],
            ({spotifyClientId, spotifyClientSecret}) => {
                login(spotifyClientId, spotifyClientSecret);
            }
        );

        function search (query) {
            const encodedQuery = encodeURIComponent(query);

            return fetch(`https://api.spotify.com/v1/search?type=track&q=${encodedQuery}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            .then(response => response.json());
        }

        speechRecognizer.onresult = function (event) {
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const transcript = event.results[i][0].transcript;
                const censoredPossibleSongTitle = event.results[i - 1]
                    ? event.results[i - 1][0].transcript.trim()
                    : ''
                ;

                let uncensoredPossibleSongTitle = censoredPossibleSongTitle;

                Object.keys(censoredRegexToUncensoredWordMap).forEach(censoredRegex => {
                    uncensoredPossibleSongTitle = uncensoredPossibleSongTitle.replace(
                        new RegExp(censoredRegex, 'g'),
                        censoredRegexToUncensoredWordMap[censoredRegex]
                    );
                });

                const possibleSongTitle = uncensoredPossibleSongTitle;

                if (transcript.trim() === 'new song') {
                    search(possibleSongTitle).then(data => {
                        const songs = data.tracks.items;

                        const song = songs[0];

                        if (!song) {
                            console.log(`Could not find song with search: ${possibleSongTitle}`);
                            return;
                        }

                        const songTitle = song.name;
                        const songArtists = song.artists.map(artist => artist.name);

                        const songIdentifier = `song:${songTitle}|${songArtists.join(', ')}`;

                        chrome.storage.local.get([songIdentifier], songInStorage => {
                            if (songInStorage.id) {
                                console.log(`Already in your list: ${songIdentifier}`);
                                return;
                            }

                            addSongToTable(song, songIdentifier);

                            chrome.storage.local.get(['songIdentifiers'], ({ songIdentifiers }) => {
                                if (!Array.isArray(songIdentifiers)) {
                                    songIdentifiers = [];
                                }

                                console.log(`Adding: ${songIdentifier}`);
                                songTitleIdentifierMap[possibleSongTitle] = songIdentifier;
                                songIdentifiers = [...new Set(songIdentifiers)]; // unique array
                                songIdentifiers.push(songIdentifier);

                                chrome.storage.local.set({
                                    [songIdentifier]: song,
                                    songIdentifiers,
                                });
                            });
                        });
                    });

                    break;
                }

                if (transcript.trim() === 'remove song') {
                    if (songTitleIdentifierMap[possibleSongTitle]) {
                        const songIdentifier = songTitleIdentifierMap[possibleSongTitle];
                        console.log(`Removing: "${songTitleIdentifierMap[possibleSongTitle]}"`);
                        chrome.storage.local.remove(songIdentifier);
                        chrome.storage.local.get(['songIdentifiers'], ({ songIdentifiers }) => {
                            songIdentifiers = songIdentifiers.filter(
                                songIdentifierInStorage => songIdentifier !== songIdentifierInStorage
                            );
                            chrome.storage.local.set({
                                songIdentifiers,
                            });
                        });
                    } else {
                        console.log(`Could not remove song with search: ${possibleSongTitle}`);
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
            console.log('Speech Recognize Error', event);
        };
    }

    function addSongToTable (song, songIdentifier) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');

        tr.appendChild(td);

        td.innerHTML = `<img width="120" src="${song.album.images[0].url}" /> ${song.name} | ${song.artists.map(artist => artist.name).join(', ')} `;

        td.innerHTML += `<button class="remove-button">Remove</button>`;

        tr.querySelector('.remove-button').setAttribute('data-song-identifier', songIdentifier);

        const spotifyTracklistEl = document.getElementById('spotifyTracklist');
        spotifyTracklistEl.appendChild(tr);
    }

    function seedInitialTracklistTable () {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['songIdentifiers'], ({ songIdentifiers }) => {
                if (!Array.isArray(songIdentifiers)) {
                    return;
                }

                songIdentifiers.forEach((songIdentifier, idx) => {
                    chrome.storage.local.get([songIdentifier], song => {
                        song = song[songIdentifier];

                        if (!song) {
                            // TODO - remove from songIdentifiers
                            return;
                        }

                        addSongToTable(song, songIdentifier);
                    });
                });

                resolve(); // TODO - obviously not the right place to put it
            });
        });
    }

    if (!document.getElementById('spotifyTracklist')) {
        document.body.innerHTML = '<table id="spotifyTracklist"></table>';

        seedInitialTracklistTable().then(startListeningAndAdding);
    } else {
        startListeningAndAdding();
    }

    document.addEventListener('click', e => {
        if (!e.target.classList.contains('remove-button')) {
            return;
        }

        e.target.innerText = 'REMOVED';

        e.target.parentNode.classList.add('removed');

        const songIdentifier = e.target.getAttribute('data-song-identifier');

        // remove songIdentifier object and its respective array entry
        chrome.storage.local.remove(songIdentifier);
        chrome.storage.local.get(['songIdentifiers'], ({ songIdentifiers }) => {
            songIdentifiers = songIdentifiers.filter(
                songIdentifierInStorage => songIdentifier !== songIdentifierInStorage
            );
            chrome.storage.local.set({
                songIdentifiers,
            });
        });
    });

    if (msg.text === HOTKEY_LEFT_PEDAL) {
        console.log('yup', msg.text);
        sendResponse('success');
    } else if (msg.text === HOTKEY_RIGHT_PEDAL) {
        console.log('yup', msg.text);
        sendResponse('success');
    }
});
