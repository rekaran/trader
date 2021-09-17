const { default: axios } = require("axios");
const mongoose = require("mongoose");
const Mongoose = require('mongoose').Mongoose;
const Binance = require('node-binance-api');
const binance = new Binance();
const createHmac = require('crypto').createHmac;

const coins = {
    // bitcoin: "BTCUSDT",
    ethereum: "ETHUSDT",
    // cardano: "ADAUSDT",
    // binancecoin: "BNBUSDT",
    // ripple: "XRPUSDT",
    // solana: "SOLUSDT",
    // polkadot: "DOTUSDT",
    // dogecoin: "DOGEUSDT",
    // "terra-luna": "LUNAUSDT",
    // chainlink: "LINKUSDT",
    // uniswap: "UNIUSDT",
    // "avalanche-2": "AVAXUSDT",
    // litecoin: "LTCUSDT",
    // "bitcoin-cash": "BCHUSDT",
    // algorand: "ALGOUSDT",
    // "ftx-token": "FTTUSDT",
    // "internet-computer": "ICPUSDT",
    // "matic-network": "MATICUSDT",
    // filecoin: "FILUSDT",
    // cosmos: "ATOMUSDT",
    // shiba: "SHIBUSDT"
}

// DataBase Connection
var dataManager = new Mongoose({ useUnifiedTopology: true });
dataManager.connect("mongodb+srv://verox:Cjd38cdbBjWP7b1K@verox.3g7nh.mongodb.net/Signals?authSource=admin&replicaSet=atlas-4iomyp-shard-0&readPreference=primary&ssl=true&ssl_cert_reqs=CERT_NONE", { useNewUrlParser: true, useUnifiedTopology: true, }).then();

// Collection Objects
var db_signals = dataManager.model("signals_new", new mongoose.Schema({},{ strict: false }), "signals_new");

const signalStream = db_signals.watch([], { fullDocument: "updateLookup" });
signalStream.on('change', (change) => {
    signalTrade(change.fullDocument);
});

let headers = {
    "X-MBX-APIKEY":"",
    "Content-Type":"application/json"
}

let buyCoin = async (coin, usdt, price, key, secret) => {
    let amount = parseFloat((usdt/price).toFixed(4)).toFixed(8);
    let _headers = {...headers};
    _headers["X-MBX-APIKEY"] = key;
    let data = `symbol=${coin}&side=BUY&type=LIMIT&timeInForce=GTC&quantity=${amount}&price=${price}&recvWindow=50000&timestamp=${new Date().getTime()}`;
    let signature = createHmac("sha256", secret).update(data).digest("hex");
    data = data+`&signature=${signature}`;
    let url =  `https://api.binance.com/api/v3/order?${data}`;
    axios.post(url, undefined, {headers: _headers}).then(res=>console.log(res.data)).catch(err=>console.log(err.response.data));
}

let sellCoin = async (coin, quantity, price, key, secret) => {
    quantity = quantity.toFixed(4);
    let _headers = {...headers};
    _headers["X-MBX-APIKEY"] = key;
    let data = `symbol=${coin}&side=SELL&type=LIMIT&timeInForce=GTC&quantity=${quantity}&price=${price}&recvWindow=50000&timestamp=${new Date().getTime()}`;
    let signature = createHmac("sha256", secret).update(data).digest("hex");
    data = data+`&signature=${signature}`;
    let url =  `https://api.binance.com/api/v3/order?${data}`;
    axios.post(url, undefined, {headers: _headers}).then(res=>console.log(res.data)).catch(err=>console.log(err.response.data));
}

let getWalletBalance = async (coin, label) => {
    let coin_ = label=="B"? "USDT":coin.replace("USDT", "");
    let data = `timestamp=${new Date().getTime()}`;
    let signature = createHmac("sha256", "GzJUJXrHvfXsfnjOY00T9fZX6eQj9sXWyGtzEinO9YmspXjaLss9YQpObFRui3mn").update(data).digest("hex");
    data = data+`&signature=${signature}`;
    let _headers = {...headers};
    _headers["X-MBX-APIKEY"] = "hVTm4iHS97ZD6KFakKSezhN4bcFAbS8Joz7CvTtJgxXl3C3txRd3tcSphYPl1gm5";
    let url =  `https://api.binance.com/api/v3/account?${data}`;
    let r = await axios.request({method:"get",url:url, headers:_headers});
    let amount = 0
    r.data.balances.forEach(b=>{
        if(b.asset == coin_) amount = parseFloat(b.free);
    });
    if(label=="B") amount = amount -10;
    return amount;
}

let cancelExistingOrder = async coin =>{
    let data = `symbol=${coin}&recvWindow=50000&timestamp=${new Date().getTime()}`;
    let signature = createHmac("sha256", "GzJUJXrHvfXsfnjOY00T9fZX6eQj9sXWyGtzEinO9YmspXjaLss9YQpObFRui3mn").update(data).digest("hex");
    data = data+`&signature=${signature}`;
    let _headers = {...headers};
    _headers["X-MBX-APIKEY"] = "hVTm4iHS97ZD6KFakKSezhN4bcFAbS8Joz7CvTtJgxXl3C3txRd3tcSphYPl1gm5";
    let url =  `https://api.binance.com/api/v3/openOrders?${data}`;
    try {
        let r = await axios.request({method:"delete",url:url, headers:_headers});
        console.log(r.data)
    } catch (error) {
    }
}

let signalTrade = async data => {
    if(Object.keys(coins).includes(data.coin)){
        await cancelExistingOrder(coins[data.coin]);
        let amount = await getWalletBalance(coins[data.coin], data.label);
        console.log(amount);
        try {
            let ticker = await binance.prices(coins[data.coin]);
            // if(data.label == "B") buyCoin(coins[data.coin], amount, ticker[coins[data.coin]], "hVTm4iHS97ZD6KFakKSezhN4bcFAbS8Joz7CvTtJgxXl3C3txRd3tcSphYPl1gm5", "GzJUJXrHvfXsfnjOY00T9fZX6eQj9sXWyGtzEinO9YmspXjaLss9YQpObFRui3mn");
            // if(data.label == "S") sellCoin(coins[data.coin], amount, ticker[coins[data.coin]], "hVTm4iHS97ZD6KFakKSezhN4bcFAbS8Joz7CvTtJgxXl3C3txRd3tcSphYPl1gm5", "GzJUJXrHvfXsfnjOY00T9fZX6eQj9sXWyGtzEinO9YmspXjaLss9YQpObFRui3mn");
        } catch (error) {
            console.log(error);
        }
    }
}

// signalTrade({coin: "ethereum", label: "B"})