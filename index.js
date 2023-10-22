require("dotenv").config()

const AUTH_TOKEN = process.env.SIGNATURE + process.env.API_KEY;
const COINPAIR = process.env.COINPAIR;
const BUY_TRIGGER = parseFloat(process.env.BUY_TRIGGER);
const PROFITABILITY = parseFloat(process.env.PROFITABILITY);
const SELL_TRIGGER = BUY_TRIGGER * PROFITABILITY;

let isOpened = false;
let amountToBuy = parseFloat(process.env.BUY_AMOUNT);
let amountToSell = 0;

const { Socket } = require("phoenix-channels");

const socket = new Socket(`wss://websocket.bitpreco.com/orderbook/socket`);
socket.connect();

socket.onOpen(() => console.log("Connected successfully"));

socket.onError((err) => {
  console.error(err);
  process.exit(0);
})

const channel = socket.channel("ticker:ALL-BRL", {});
channel.join()
  .receive("ok", () => console.log("Join successfully"))
  .receive("error", (resp) => console.log(resp))

channel.on("price", payload => {
  console.clear();

  const coinPair = payload[COINPAIR];
  console.log(coinPair)

  if (!isOpened) {
    console.log("Buy Trigger: " + BUY_TRIGGER);

    if (coinPair.sell <= BUY_TRIGGER) {
      isOpened = true;
      console.log("BUY!");
      buy()
        .catch(err => {
          console.error(err);
          process.exit(0);
        })
    }
  } else {
    console.log("sell Trigger: " + SELL_TRIGGER);
    if (coinPair.buy >= SELL_TRIGGER) {
      console.log("SELL!");
      sell()
        .then(response => {
          isOpened = false;
        })
        .catch(err => {
          console.error(err);
          process.exit(0);
        })
    }
  }
})

const axios = require("axios");

async function buy(){
  const data = await call("buy", amountToBuy);
  console.log(data);
  amountToSell = data.exec_amount;
  return data;
}

async function sell() {
  const data = await call("sell", amountToSell);
  console.log(data);
  amountToBuy = data.exec_amount;
  return data;
}

async function call(side, volume){
  const url = "https://api.bitpreco.com/v1/trading/" + side;
  const data = {
    market: COINPAIR,
    volume,
    limited: false,
    auth_token: AUTH_TOKEN
  }
  const response = await axios.post(url, data);
  return(response.data);
}

