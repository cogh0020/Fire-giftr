import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider, onAuthStateChanged, signInWithPopup, signInWithCredential } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, query, where, addDoc, deleteDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCWoqnhvZODeT6GBEJdHOF6IZ_df-ElpJI",
  authDomain: "fire-giftr-8f313.firebaseapp.com",
  projectId: "fire-giftr-8f313",
  storageBucket: "fire-giftr-8f313.appspot.com",
  messagingSenderId: "109287465088",
  appId: "1:109287465088:web:ca620efb75594240af0665"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
// get a reference to the database
const db = getFirestore(app)
const myPeopleRef = collection(db, 'people')
const myIdeasRef = collection(db, 'gift-ideas')
let people = []
let giftIdeas = []
let currentPersonID = ''
let currentPersonRef = undefined
let currentUserRef = undefined

const auth = getAuth(app)
const provider = new GithubAuthProvider()
provider.setCustomParameters({
  'allow_signup': 'true'
})
auth.languageCode = 'en'

document.addEventListener('DOMContentLoaded', () => {

  validateWithToken(JSON.parse(window.sessionStorage.getItem('giftr')))
  
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
    .addEventListener('click', handlePersonClick);
  document
  .getElementById('btnAddIdea')
  .addEventListener('click', handleIdeaClick);

  document
  .getElementById('btnSavePerson')
  .addEventListener('click', savePerson)

  document
  .getElementById('btnSaveIdea')
  .addEventListener('click', saveIdea)
  
  document
  .getElementById('personUL')
  .addEventListener('click', handlePersonClick)

  document
  .getElementById('ideaUL')
  .addEventListener('click', handleIdeaClick)

  document.getElementById('sign-in-button')
  .addEventListener('click', attemptLogin)
  
  document.getElementById('sign-out-button')
  .addEventListener('click', handleLogout)
});

//get people collection from database
async function getPeople(){
  console.log("Get people called")
  people = []
    //call this from DOMContentLoaded init function 
    //the db variable is the one created by the getFirestore(app) call.

  const userRef = await getUser();
  console.log(userRef)
  const peopleCollectionRef = collection(db, "people")
  const docs = query(
    peopleCollectionRef,
    where('owner','==',userRef)
  )
  const querySnapshot = await getDocs(docs);
  console.log(querySnapshot)
  //const querySnapshot = await getDocs(collection(db, 'people'));
  querySnapshot.forEach((doc) => {
  //every `doc` object has a `id` property that holds the `_id` value from Firestore.
  //every `doc` object has a doc() method that gives you a JS object with all the properties
  const data = doc.data();
  const id = doc.id;
  people.push({id, ...data});
  });
    buildPeople(people);
    //If there are people in the database, automatically set the first person as selected
  if (people.length > 0 ){
    currentPersonID = people[0].id
    setSelectedPerson()
    getIdeas(currentPersonID)
  }
}

//Create the list of persons in li elements
function buildPeople(people){
  console.log("Build people called" + people)
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

//Get Ideas gets a reference to a person document, then queries the server for that document's gifts
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

//buildIdeas sets the innerHTML of the ideas UL 
function buildIdeas(ideas){
  console.log("Build Ideas called")
  let ul = document.querySelector('ul.idea-list')
  if (!ideas) { //buildIdeas was called but the value was "falsey". buildIdeas was most likely called from clearScreen"
    ul.innerHTML = ``
  } else { 
    if (ideas.length == 0) {
      ul.innerHTML = 
      `<li id="noIdeaModal" class="idea">
        <div class="emptyIdeas">
          <h2>No ideas yet!</h2>
        </div>
      </li>`
    } else {
      ul.innerHTML = ideas.map(gift=>{
      return `<li data-id="${gift.id}" class="idea">
              <label for="chk-uniqueid"><input type="checkbox" id="chk-uniqueid" /> Bought</label>
              <div class="gift-content">
                <div class="gift-text">
                  <p class="title">${gift.idea}</p>
                  <p class="location">${gift.location}</p>
                </div>
                <div class="gift-buttons">
                  <button class="edit">Edit</button>
                  <button class="delete">Delete</button>
                </div>
              </div>
            </li>`;
      }).join('')
    }
  }
}

//copied from course notes. Saves a person document's data from the overlay form. 
//Handles add and edit based on if a docRef was found
async function savePerson(ev){
  //function called when user clicks save button from person dialog
  let name = document.getElementById('name').value
  let month = document.getElementById('month').value
  let day = document.getElementById('day').value
  if(!name || !month || !day) return; //form needs more info 
  const person = {
    name,
    'birth-month': month,
    'birth-day': day,
    'owner':currentUserRef
  }
  console.log(person)
  let id = document.getElementById('btnSavePerson').dataset.id
  console.log(id, myPeopleRef)
  let docRef
  if (id){ //doc() cannot be called with an empty path. We first check if an ID was on the button
    docRef = doc(myPeopleRef, id)
  }
  console.log(docRef)

  if (docRef){ //an id is being stored. Call setDoc using this value
    try {
      await setDoc(docRef, person)
      //1. clear the form fields 
      document.getElementById('name').value = '';
      document.getElementById('month').value = '';
      document.getElementById('day').value = '';
      //2. hide the dialog and the overlay
      hideOverlay();
      //3. display a message to the user about success 
      person.id = docRef.id;
      tellUser(`Person with ID ${person.id} edited`);
      //4. ADD the new HTML to the <ul> using the new object
      showPerson(person);
      } catch (err) {
        console.error('Error adding document: ', err);
      }
  } else { //There is no id, call addDoc
    try {
      const docRef = await addDoc(collection(db, 'people'),person )
      console.log('Document written with ID: ', docRef.id)
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
      }
  }
}

//copied from course notes, added months variable
function showPerson(person){
  let li = document.querySelectorAll(`[data-id='${person.id}']`); //Find an li in the dom with an id that matches the created person
  console.log(li)
  let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September','October','November','December'];
  if(li.length > 0){ //TODO: Find a way to return the li with a corresponding data-id value
    //update on screen
    const dob = `${months[person['birth-month']-1]} ${person['birth-day']}`;
    //Use the number of the birth-month less 1 as the index for the months array
    //replace the existing li with this new HTML
    li[0].outerHTML = `<li data-id="${person.id}" class="person">
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
  console.log("Show Idea called")
  console.log(gift)
  let li = document.getElementById(gift.id);

  if(li){
    //update on screen
    //replace the existing li with this new HTML
    li.outerHTML =
          ` <li data-id="${gift.id}" class="idea">
            <label for="chk-uniqueid"><input type="checkbox" id="chk-uniqueid" /> Bought</label>
            <div class="gift-content">
              <div class="gift-text">
                <p class="title">${gift.idea}</p>
                <p class="location">${gift.location}</p>
              </div>
              <div class="gift-buttons">
                <button class="edit">Edit</button>
                <button class="delete">Delete</button>
              </div>
            </div>
          </li>`
  }else{
    //add to screen
    li = 
    ` <li data-id="${gift.id}" class="idea">
            <label for="chk-uniqueid"><input type="checkbox" id="chk-uniqueid" /> Bought</label>
            <div class="gift-content">
              <div class="gift-text">
                <p class="title">${gift.idea}</p>
                <p class="location">${gift.location}</p>
              </div>
              <div class="gift-buttons">
                <button class="edit">Edit</button>
                <button class="delete">Delete</button>
              </div>
            </div>
          </li>`
    let emptyDiv = document.getElementById("noIdeaModal") //If we have something in the gift ideas, we dont need the "No ideas" indicator anymore
    if (emptyDiv != null){
      emptyDiv.remove()
    }
    console.log(emptyDiv)
    document.querySelector('ul.idea-list').innerHTML += li;
  }
}

async function deletePerson(item){
  await deleteDoc(doc(db, 'people', item.dataset.id ))

  if (item.dataset.id == currentPersonID) { //If the person that is selected/highlighted is deleted, clear the ideas list
    buildIdeas()
  }

  item.remove() //remove the li from the dom
  console.log("Person deleted with id:" + item.dataset.id)
}

async function deleteGift(item){
  await deleteDoc(doc(db, 'gift-ideas', item.dataset.id ))
  item.remove()
  console.log("Gift deleted with id:" + item.dataset.id)
}


//Create a message in the console to alert the user
function tellUser(message){
  console.log(message)
}

function hideOverlay(ev) {
  document.querySelector('.overlay').classList.remove('active');
  document
    .querySelectorAll('.overlay dialog')
    .forEach((dialog) => dialog.classList.remove('active'));
  //TODO: Clear the dataset id from overlay and add buttons
  
}

function handleIdeaClick(ev){
  ev.preventDefault()
  console.log("handleIdeaClick called")
  const li = ev.target.closest(".idea")
  const id = li ? li.dataset.id : null
  console.log(li)
  if (id){
    if (ev.target.classList.contains('edit')){
      console.log('Editing a gift')
      document.getElementById('btnSaveIdea').dataset.id = id
      document.getElementById('dlgIdeaHeader').innerText ='Edit a gift'
      document.querySelector('.overlay').classList.add('active')
      document.getElementById('dlgIdea').classList.add('active')
      //EDIT the doc using the id to get a docRef
      //show the dialog form to EDIT the doc
      //load all the thing document details into the form from docRef
    } else if (ev.target.classList.contains('delete')){
      console.log('Deleting an idea')
      //TODO: Make a confirmation window for deleting items
      deleteGift(li)
    } else {
      //Content inside the <li> but not a <button> was clicked
      //If the <li> was a person, set to the current selection
      console.log("Clicked in the li but not on a button")
    }

  } else {
    console.log("Clicked a button not inside li")
    //Show overlay with idea dialog
    document.getElementById('dlgIdeaHeader').innerText ='Add a gift'
    document.querySelector('.overlay').classList.add('active')
    document.getElementById('dlgIdea').classList.add('active')
  }
}

function handlePersonClick(ev){
  ev.preventDefault()
  console.log("handlePersonClick called")
  const li = ev.target.closest(".person")
  const id = li ? li.dataset.id : null
  console.log(li)
  if (id){
    if (ev.target.classList.contains('edit')){
      console.log('Editing a person')
      document.getElementById('btnSavePerson').dataset.id = id
      //EDIT the doc using the id to get a docRef
      //show the dialog form to EDIT the doc
      //Set the Header for the dialog overlay to "Edit"
      document.getElementById('dlgPersonHeader').innerText ='Edit a person'
      document.querySelector('.overlay').classList.add('active')
      document.getElementById('dlgPerson').classList.add('active')
      //Set the save button
      //load all the thing document details into the form from docRef
    } else if (ev.target.classList.contains('delete')){
      console.log('Deleting a person')
      //TODO: Make a confirmation window for deleting items
      deletePerson(li)
    } else {
      //Content inside the <li> but not a <button> was clicked
      //If the <li> was a person, set to the current selection
      currentPersonID = id
      setSelectedPerson()
      getIdeas(currentPersonID)
    }
  } else {
    console.log("Clicked a button not inside li")
    //Show overlay with person dialog
    //Clear the dataset from the save button
    //Set the header for the dialog to "Add"
    document.getElementById('dlgPersonHeader').innerText = 'Add a person'
    document.getElementById('btnSavePerson').dataset.id = ''
    document.querySelector('.overlay').classList.add('active')
    document.getElementById('dlgPerson').classList.add('active')
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

function clearScreen() {
  //When the user logs out, remove data from the person and giftIdea arrays and rebuild.
  people = []
  giftIdeas = []
  buildPeople(people)
  buildIdeas()
}

//AUTH FUNCTIONS

async function attemptLogin(){
  console.log("Attempting to login")
  signInWithPopup(auth, provider)
  .then((result)=> {
    const credential = GithubAuthProvider.credentialFromResult(result)
    const token = credential.accessToken

    const user = result.user
    console.log(auth)
    const usersColRef = collection(db, 'users')
    setDoc(doc(usersColRef, user.uid), {
      displayName: user.displayName
    }, {merge:true})

    window.sessionStorage.setItem("giftr", JSON.stringify(token))
    if (user){
      console.log("User found while signing in with popup")
      getPeople()
    }

  }).catch ((error)=>{
    const errorCode = error.code
    const errorMessage = error.message
    const email = error.customData.email;
    // The AuthCredential type that was used
    const credential = GithubAuthProvider.credentialFromError(error);
  })
}

async function handleLogout(){
  try {
    await auth.signOut()
    .then(window.sessionStorage.removeItem("giftr"))
    clearScreen()

    //Hide the UI
  } catch (error){
    console.log("Error while logging out:" + error.message)
  } 
}

onAuthStateChanged(auth, (user) =>{
  if (user) {
    //User is signed in
    console.log("Auth state: User signed in" + user)
    document.getElementById("sign-in-button").style.display = "none";
    document.getElementById("sign-out-button").style.display = "inline-block";
    document.getElementById("btnAddPerson").style.display = "inline-block";
    document.getElementById("btnAddIdea").style.display = "inline-block";
  } else {
    //user is signed out
    console.log("Auth state: User signed out")
    document.getElementById("sign-in-button").style.display = "inline-block";
    document.getElementById("sign-out-button").style.display = "none";
    document.getElementById("btnAddIdea").style.display = "none";
    document.getElementById("btnAddPerson").style.display = "none";

  }
})

function validateWithToken(token){
  try {
    const credential = GithubAuthProvider.credential(token);
    console.log(credential)
    signInWithCredential(auth, credential)
      .then((result) => {
        const user = result.user
        //the token and credential were still valid 
        getPeople()
      })
      .catch((error) => {
        console.log("Validate failed")
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
      })
    } catch (err) {
      console.log(err)
    }
}
//PERMISSION METHODS
async function getUser() {
  const ref = doc(db, "users", auth.currentUser.uid)
  currentUserRef = ref
  console.log(currentUserRef)
  return ref
}