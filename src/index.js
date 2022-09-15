import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, query, where, addDoc } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyCWoqnhvZODeT6GBEJdHOF6IZ_df-ElpJI",
  authDomain: "fire-giftr-8f313.firebaseapp.com",
  projectId: "fire-giftr-8f313",
  storageBucket: "fire-giftr-8f313.appspot.com",
  messagingSenderId: "109287465088",
  appId: "1:109287465088:web:ca620efb75594240af0665"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// get a reference to the database
const db = getFirestore(app);
const myDocumentRef = doc(db, 'collection-name', 'document-id');
const myCollectionRef = collection(db, 'collection-name');
// const peopleCollectionRef = collection(db, 'people');
// const giftIdeasCollectionRef = collection(db, 'gift-ideas')
const people = [];
const giftIdeas = [];

document.addEventListener('DOMContentLoaded', () => {
  //set up the dom events
  document
    .getElementById('btnCancelPerson')
    .addEventListener('click', hideOverlay);
  document
    .getElementById('btnCancelIdea')
    .addEventListener('click', hideOverlay);
  document.querySelector('.overlay').addEventListener('click', hideOverlay);

  document
    .getElementById('btnAddPerson')
    .addEventListener('click', showOverlay);
  document.getElementById('btnAddIdea').addEventListener('click', showOverlay);

  getPeople()
});

async function getPeople(){
  //call this from DOMContentLoaded init function 
  //the db variable is the one created by the getFirestore(app) call.
  const querySnapshot = await getDocs(collection(db, 'people'));
  querySnapshot.forEach((doc) => {
    //every `doc` object has a `id` property that holds the `_id` value from Firestore.
    //every `doc` object has a doc() method that gives you a JS object with all the properties
    const data = doc.data();
    const id = doc.id;
    people.push({id, ...data});
  });
  buildPeople(people);
}

function buildPeople(people){
  let ul = document.querySelector('ul.person-list');
  let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September','October','November','December'];
  ul.innerHTML = people.map(person=>{
    const dob = `${months[person['birth-month']-1]} ${person['birth-day']}`
    return `<li data-id="${person.id}" class="person">
            <p class="name">${person.name}</p>
            <p class="dob">${dob}</p>
          </li>`;
  }).join('')
}

async function getIdeas(id){
  //get an actual reference to the person document 
  const personRef = doc(collection(db, 'people'), id);
  //then run a query where the `person-id` property matches the reference for the person
  const docs = query(
    collection(db, 'gift-ideas'),
    where('person-id', '==', personRef)
  );
  const querySnapshot = await getDocs(docs);

  querySnapshot.forEach((doc) => { 
    //work with the resulting docs
  });
}



function hideOverlay(ev) {
  ev.preventDefault();
  document.querySelector('.overlay').classList.remove('active');
  document
    .querySelectorAll('.overlay dialog')
    .forEach((dialog) => dialog.classList.remove('active'));
}
function showOverlay(ev) {
  ev.preventDefault();
  document.querySelector('.overlay').classList.add('active');
  const id = ev.target.id === 'btnAddPerson' ? 'dlgPerson' : 'dlgIdea';
  //TODO: check that person is selected before adding an idea
  document.getElementById(id).classList.add('active');
}
