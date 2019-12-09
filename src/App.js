import React from 'react';
import './App.css';
import Board from 'react-trello'


import Arweave from 'arweave/web';
const arweave = Arweave.init();
const APP_NAME_KEY = "App-Name";
const APP_NAME = "arweave-kanbant";


var delayTimer;
class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      data: {
        lanes: []
      },
      id: Math.random().toString(36).substr(2, 9),
      jwk: null,
    };
  }
  search = async (id) => {
    this.setState({ id })
    clearTimeout(delayTimer);
    delayTimer = setTimeout(async () => {
      const txs = await arweave.arql({
        op: "and",
        expr1: {
          op: "equals",
          expr1: APP_NAME_KEY,
          expr2: APP_NAME
        },
        expr2: {
          op: "equals",
          expr1: "id",
          expr2: id
        }
      });
      if (txs[0]) {
        const transaction = await arweave.transactions.get(txs[0]);
        const data = JSON.parse(transaction.get('data', { decode: true, string: true }));
        this.setState({ data })
      }
    }, 1000);

  }
  save = (data) => {
    this.setState({ data });
  }
  publish = async () => {
    const jwk = this.state.jwk;

    let transaction = await arweave.createTransaction({
      data: JSON.stringify(this.state.data),
    }, jwk);

    transaction.addTag(APP_NAME_KEY, APP_NAME);
    transaction.addTag("id", this.state.id);

    const anchor_id = (await arweave.api.get('/tx_anchor')).data
    transaction.last_tx = anchor_id

    await arweave.transactions.sign(transaction, jwk)
    const response = await arweave.transactions.post(transaction)

    alert(`Response Status: ${response.status}, Id - ${transaction.id}`);
  }
  readWallet = async (file) => {
    let jwk = JSON.parse(await readWallet(file));
    this.setState({ jwk });
  }
  render() {
    if (!this.state.jwk) {
      return (
        <div className="main">
          <button className="btn" onClick={() => document.getElementById('upload').click()}>Upload Arweave Wallet</button>
          <input type="file" id="upload" onChange={e => this.readWallet(e.target.files[0])} style={{ display: "none" }} />
        </div>
      )
    }
    return (
      <div>
        <input style={{ width: "100%" }} type="text" placeholder="Search by board ID..." onChange={(e) => {
          this.search(e.target.value)
        }} />
        <div className="btitle">Board ID: {this.state.id}</div>
        {
          <Board onDataChange={this.save} editable={true} draggable={true} canAddLanes={true} data={this.state.data} />
        }
        <button onClick={this.publish} className="publish btn">Save</button>
      </div>
    )
  }
}
const readWallet = (wallet) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reader.abort()
      reject()
    }
    reader.addEventListener("load", () => { resolve(reader.result) }, false)
    reader.readAsText(wallet)
  })
}

export default App;
