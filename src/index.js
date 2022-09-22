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
const people = [];
const giftIdeas = [];
let currentPersonID = '';
let currentPersonRef = undefined;

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM content loaded")
  //set up the dom events
  document
    .getElementById('btnCancelPerson')
    .addEventListener('click', hideOverlay);
  document
    .getElementById('btnCancelIdea')
    .addEventListener('click', hideOverlay);

    //Event listeners for AddPerson and AddIdea
  document
    .getElementById('btnAddPerson')
    .addEventListener('click', showOverlay);
  document
  .getElementById('btnAddIdea')
  .addEventListener('click', showOverlay);

  document
  .getElementById('btnSavePerson')
  .addEventListener('click', savePerson)

  document
  .getElementById('btnSaveIdea')
  .addEventListener('click', saveIdea)
  
  document
  .getElementById('personUL')
  .addEventListener('click', handleClick)

  getPeople()
});

//get people collection from database
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

//Create the list of persons in li elements
function buildPeople(people){
  let ul = document.querySelector('ul.person-list');
  let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September','October','November','December'];
  ul.innerHTML = people.map(person=>{
    const dob = `${months[person['birth-month']-1]} ${person['birth-day']}`
    return `<li data-id="${person.id}" class="person">
            <p class="name">${person.name}</p>
            <p class="dob">${dob}</p>
            <button class="edit">Edit</button>
            <button class="delete">Delete</button>
          </li>`;
  }).join('')
}

async function getIdeas(id){
  //get an actual reference to the person document 
  const personRef = doc(collection(db, 'people'), id);
  currentPersonRef = personRef
  //then run a query where the `person-id` property matches the reference for the person
  const docs = query(
    collection(db, 'gift-ideas'),
    where('person-id', '==', personRef)
  );
  const querySnapshot = await getDocs(docs);
  //Clear the gift ideas array
  while (giftIdeas.length > 0){
    giftIdeas.pop()
    console.log("Removing item from gift ideas array")
  }
  querySnapshot.forEach((doc) =>{
    const data = doc.data()
    const id = doc.id
    giftIdeas.push({id, ...data})
  })
  console.log(giftIdeas)
  buildIdeas(giftIdeas)
}

function buildIdeas(ideas){
  let ul = document.querySelector('ul.idea-list')
  //Clear the UL of existing ideas
  ul.innerHTML = ideas.map(idea=>{
    return `<li data-id="${idea.id}" class="idea">
            <label for="chk-uniqueid"
              ><input type="checkbox" id="chk-uniqueid" /> Bought</label
            >
            <p class="title">${idea.idea}</p>
            <p class="location">${idea.location}</p>
          </li>`;
  }).join('')
}

//copied from course notes
async function savePerson(ev){
  //function called when user clicks save button from person dialog
  let name = document.getElementById('name').value;
  let month = document.getElementById('month').value;
  let day = document.getElementById('day').value;
  if(!name || !month || !day) return; //form needs more info 
  const person = {
    name,
    'birth-month': month,
    'birth-day': day
  };
  console.log(person)
  try {
    const docRef = await addDoc(collection(db, 'people'), person );
    console.log('Document written with ID: ', docRef.id);
    //1. clear the form fields 
    document.getElementById('name').value = '';
    document.getElementById('month').value = '';
    document.getElementById('day').value = '';
    //2. hide the dialog and the overlay
    hideOverlay();
    //3. display a message to the user about success 
    tellUser(`Person ${name} added to database`);
    person.id = docRef.id;
    //4. ADD the new HTML to the <ul> using the new object
    showPerson(person);
  } catch (err) {
    console.error('Error adding document: ', err);
    //do you want to stay on the dialog?
    //display a mesage to the user about the problem
  }
}

//copied from course notes, added months variable
function showPerson(person){
  let li = document.getElementById(person.id);
  let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September','October','November','December'];
  if(li){
    //update on screen
    const dob = `${months[person['birth-month']-1]} ${person['birth-day']}`;
    //Use the number of the birth-month less 1 as the index for the months array
    //replace the existing li with this new HTML
    li.outerHTML = `<li data-id="${person.id}" class="person">
            <p class="name">${person.name}</p>
            <p class="dob">${dob}</p>
            <button class="edit">Edit</button>
            <button class="delete">Delete</button>
          </li>`;
  }else{
    //add to screen
    const dob = `${months[person['birth-month']-1]} ${person['birth-day']}`;
    //Use the number of the birth-month less 1 as the index for the months array
    li = `<li data-id="${person.id}" class="person">
            <p class="name">${person.name}</p>
            <p class="dob">${dob}</p>
            <button class="edit">Edit</button>
            <button class="delete">Delete</button>
          </li>`;
    document.querySelector('ul.person-list').innerHTML += li;
  }
}


//Make a saveGift function
async function saveIdea(ev){
  //function called when user clicks save button from person dialog
  let idea = document.getElementById('title').value;
  let location = document.getElementById('location').value;
  if(!idea || !location ) return; //form needs more info 
  const gift = {
    idea,
    location,
    'person-id': currentPersonRef
  };
  try {
    const docRef = await addDoc(collection(db, 'gift-ideas'), gift );
    console.log('Document written with ID: ', docRef.id);
    //1. clear the form fields 
    document.getElementById('title').value = '';
    document.getElementById('location').value = '';
    //2. hide the dialog and the overlay
    hideOverlay();
    //3. display a message to the user about success 
    tellUser(`Gift ${idea} added to database`);
    gift.id = docRef.id;
    //4. ADD the new HTML to the <ul> using the new object
    showIdea(gift);
  } catch (err) {
    console.error('Error adding document: ', err);
    //do you want to stay on the dialog?
    //display a mesage to the user about the problem
  }
}

function showIdea(gift){
  let li = document.getElementById(gift.id);
  if(li){
    //update on screen
    //replace the existing li with this new HTML
    li.outerHTML = `<li data-id="${gift.id}" class="idea">
            <label for="chk-uniqueid"
              ><input type="checkbox" id="chk-uniqueid" /> Bought</label
            >
            <p class="title">${gift.idea}</p>
            <p class="location">${gift.location}</p>
          </li>`;
  }else{
    //add to screen
    li = `<li data-id="${gift.id}" class="idea">
            <label for="chk-uniqueid"
              ><input type="checkbox" id="chk-uniqueid" /> Bought</label
            >
            <p class="title">${gift.idea}</p>
            <p class="location">${gift.location}</p>
          </li>`;
          
    document.querySelector('ul.idea-list').innerHTML += li;
  }
}

function editPerson(){

}

//Create a message in the console to alert the user
function tellUser(message){
  console.log(message)
}

function hideOverlay(ev) {
  if (ev != undefined) {
    ev.preventDefault();
  }
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

function handleClick(ev){
  console.log("handle Click called")
  const li = ev.target.closest(".person")
  const id = li ? li.dataset.id : null
  if (id){
    if (ev.target.classList.contains('edit')){
      console.log('Editing a person')
      //EDIT the doc using the id to get a docRef
      //show the dialog form to EDIT the doc
      //load all the thing document details into the form from docRef
    } else if (ev.target.classList.contains('delete')){
      console.log('Deleting a person')
      //DELETE the doc using the id to get a docRef
      //Make a confirmation window
    } else {
      //Content inside the <li> but not a <button> was clicked
      //If the <li> was a person, set to the current selection
      currentPersonID = id
      setSelectedPerson()
      getIdeas(currentPersonID)
    }
  } else {
    console.log("Clicked a button not inside li")
  }
}

//Remove the selected class from persons, then add the tag to the currently selected one
function setSelectedPerson() {
  console.log('setSelectedPerson called')
  let personItems = document.querySelectorAll('.person')
  personItems.forEach((item)=> {
    item.classList.remove('selected')
  })
  personItems.forEach((item)=>{
    if (item.dataset.id == currentPersonID){
      console.log("Found user in list with id:" + item.dataset.id)
      item.classList.add('selected')
    }
  })
}