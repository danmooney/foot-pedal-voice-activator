// var bkg = chrome.extension.getBackgroundPage();

chrome.commands.onCommand.addListener(function (command) {
    alert('querying');

    const currentWindowQuery = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(currentWindowQuery, (tabs) => {
        tabs.forEach(tab =>
            chrome.tabs.sendMessage(
                tab.id,
                {
                    text: command
                }
            )
        );
    });
});
