import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import * as RxDB from 'rxdb';
import {QueryChangeDetector} from 'rxdb';
import { schema } from './Schema';

import { ToastContainer, toast } from 'react-toastify';


import * as moment from 'moment';

QueryChangeDetector.enable();
QueryChangeDetector.enableDebugging();

RxDB.plugin(require('pouchdb-adapter-idb'));
RxDB.plugin(require('pouchdb-adapter-http'));

const syncURL = 'http://localhost:5984/';
const dbName = 'chatdb';

class App extends Component {

  state = {
    newMessage: '', messages: []
  };
  subs = [];


async createDatabase() {
  // password must have at least 8 characters
  const db = await RxDB.create(
    {name: dbName, adapter: 'idb', password: '12345678'}
  );
    console.dir(db);


  // create collection
  const messagesCollection = await db.collection({ // создает коллекцию 
    name: 'messages',
    schema: schema
  });

  // set up replication // фича котора переносит с idb в rxdb
  const replicationState = 
    messagesCollection.sync({ remote: syncURL + dbName + '/' });

  return db;
}

async componentDidMount() {
  this.db = await this.createDatabase();

  // Subscribe to query to get all messages
  const sub = 
    this.db.messages.find().sort({id: 1}).$.subscribe(messages => {
    if (!messages)
      return;
    toast('Reloading messages');
    this.setState({messages: messages});
  });
  this.subs.push(sub);
}

componentWillUnmount() {
  // Unsubscribe from all subscriptions
  this.subs.forEach(sub => sub.unsubscribe());
}

renderMessages() {
  return this.state.messages.map(({id, message}) => {
    const date = moment(id, 'x').fromNow();
    return (
      <div key={id}>
        <p>{date}</p>
        <p>{message}</p>
        <hr/>
      </div>
    );
  });
}

handleMessageChange(event) {
  this.setState({newMessage: event.target.value});
}

async addMessage() {
  const id = Date.now().toString();
  const newMessage = {id, message: this.state.newMessage};

  await this.db.messages.insert(newMessage);
  
  this.setState({newMessage: ''});
}


render() {
  return (
    <div className="App">
      <ToastContainer autoClose={3000} />

      <div>{this.renderMessages()}</div>

      <div id="add-message-div">
        <h3>Add Message</h3>
        <input type="text" placeholder="Message" value={this.state.newMessage} onChange={(e) => this.handleMessageChange(e)} />
        <button onClick={() => this.addMessage()}>Add message</button>
      </div>

    </div>
  );
}
}

export default App;