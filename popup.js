document.addEventListener('DOMContentLoaded', () => {
    let data = {
        spotifyClientId: '',
        spotifyClientSecret: '',
        songIdentifiers: [
            'song:Over The Hills And Far Away|Led Zeppelin',
            'song:Blackbird|The Beatles',
        ],
        ['song:Over The Hills And Far Away|Led Zeppelin']: {

        },
        ['song:Blackbird|The Beatles']: {

        },
    };

    function commit (key, value) {
        data[key] = value;

        chrome.storage.local.set({
            [key]: value
        });
    }

    function saveSpotifyClientId (clientId) {
        commit('spotifyClientId', clientId);
    }

    function saveSpotifyClientSecret (clientSecret) {
        commit('spotifyClientSecret', clientSecret);
    }

    document.body.addEventListener('focusout', e => {
        debugger;
        switch (e.target.name) {
            case 'spotify_client_id':
                saveSpotifyClientId(e.target.value);
                break;
            case 'spotify_client_secret':
                saveSpotifyClientSecret(e.target.value);
                break;
        }
    }, false);

    // fetch all data on initial load
    chrome.storage.local.get(null, syncData => {
        data = syncData;

        console.log('Sync Data: ', syncData);

        if (data.spotifyClientId) {
            document.querySelector('[name="spotify_client_id"]').value =  data.spotifyClientId;
        }

        if (data.spotifyClientSecret) {
            document.querySelector('[name="spotify_client_secret"]').value = data.spotifyClientSecret;
        }
    });
});
