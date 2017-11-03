/**
 * The function goes over all of the accounts and parses out the value of the account in
 * local currency (from the account number), and updates the price using the most up to date exchange rate.
 * @param accounts
 * @param callback
 */
function setPrices(accounts, callback) {
    var xhr = new XMLHttpRequest();
    var CURRENCY_KEYWORD = "CURRENCY:";

    xhr.onreadystatechange = function () {
        if (this.readyState === 4) {
            var updated = [];
            var currenciesResponse = JSON.parse(this.responseText);
            var rates = currenciesResponse.rates;

            accounts.forEach(function (account) {
                account.name.toUpperCase().indexOf(CURRENCY_KEYWORD);
                // Get currency ticker
                var startIndex = account.name.toUpperCase().indexOf("CURRENCY:") + CURRENCY_KEYWORD.length;
                var endIndex = startIndex + 3;
                var currency = account.name.substring(startIndex, endIndex).toUpperCase();

                if (currency && rates[currency]) {
                    var valueInLocalCurrency = parseFloat(account.accountNumber);
                    if (!isNaN(valueInLocalCurrency)) {
                        account.currentBalance = Math.round(valueInLocalCurrency / rates[currency] * 100) / 100;
                        updated.push(account);
                    }
                }
            });
            callback(updated);
        }
    };
    xhr.open("GET", "https://api.fixer.io/latest?base=USD");
    xhr.send();
}

/**
 * The function gets a list of all bank accounts, and finds the ones who are both manually entered and
 * contain the the string `currency:` in its name. These will be all the accounts we will attempt to update
 * @param csrf
 * @param callback
 */
function getAccounts(csrf, callback) {
    var xhr = new XMLHttpRequest();
    var CURRENCY_KEYWORD = "CURRENCY:";
    xhr.onreadystatechange = function () {
        if (this.readyState === 4) {
            var validAccounts = [];
            var data = JSON.parse(this.responseText);
            data.spData.accounts.forEach(function (account) {
                if (account.isManual && account.name.toUpperCase().indexOf(CURRENCY_KEYWORD) !== -1) {
                    validAccounts.push(account);
                }
            });
            callback(validAccounts);
        }
    };

    xhr.open("POST", "https://home.personalcapital.com/api/newaccount/getAccounts2");
    var formdata = new FormData();
    formdata.append('csrf', csrf);
    formdata.append('apiClient', 'WEB');
    xhr.send(formdata);
}

/**
 * The function updates a given account using the personal capital API
 * @param csrf
 * @param account
 */
function updateAccount(csrf, account) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState === 4) {
            console.log('Successfully updated ' + account.name + ' to ' + account.currentBalance);
        }
    };
    xhr.open("POST", "https://home.personalcapital.com/api/newaccount/updateAccount");
    var formData = new FormData();
    formData.append('csrf', csrf);
    formData.append('apiClient', 'WEB');
    for (var key in account) {
        formData.append(key, account[key]);
    }
    xhr.send(formData);
}


/**
 * On page load, we will do the following:
 * 1. Get all the accounts that require updating, using the personal capital API
 * 2. Get all the exchange rates that we need
 * 3. Update the accounts with the new value in USD using the personal capital API
 */
window.addEventListener("message", function (event) {
    if (event.source === window && event.data.type && (event.data.type === "PCFC_CSRF")) {
        var csrf = event.data.text;

        getAccounts(csrf, function (accounts) {
            setPrices(accounts, function (updatedAccounts) {
                updatedAccounts.forEach(function (account) {
                    updateAccount(csrf, account);
                });
            });
        });

    }
}, false);

//Hacky way to retrieve user session variable from content script
var s = document.createElement('script');
s.setAttribute('type', 'text/javascript');
s.innerHTML = `window.postMessage({
    "type": "PCFC_CSRF",
    text: window.csrf
}, "*");`;
document.body.appendChild(s);
