const delay = ms => new Promise(res => setTimeout(res, ms));
let heroku;

if (window.location.hostname === "localhost") {
    // Local development
    heroku = "http://localhost:8887";
} else {
    // Online / production
    heroku = "https://quivia-7c117ffa0dd4.herokuapp.com";
}
const protocol = heroku.startsWith("https") ? "wss" : "ws";
let ws;
var user = "";
var score = 0;
var correct = 0;
var game_id;
var lengthoftime;
var starttime;
var endtime;
var timestring;
let lobbyHTML = null;
let lobbyLoaded = false;
let categoriesSet = false;
let heartbeatInterval;
let categoryTemp;
let canPick = false;
let canAnswer = false;
let myTeam = null;
let myRole = null;

function checkAll()
{
	checks = document.getElementsByTagName("input");
	for(var i=0; i<checks.length; i++) 
	{
		checks[i].checked = true;
	}
}

function invertCheck()
{
	checks = document.getElementsByTagName("input");
	for(var i=0; i<checks.length; i++) 
	{
		checks[i].checked = !checks[i].checked;
	}
}

function uncheckAll()
{
	checks = document.getElementsByTagName("input");
	for(var i=0; i<checks.length; i++) 
	{
		checks[i].checked = false;
	}
}

async function submit()
{
	const minutes = parseInt(document.getElementById("minutesInput").value);

    if (isNaN(minutes) || minutes < 0) {
		alert("Please enter a valid number of minutes.");
        return;
    }
	lengthoftime = minutes * 60000;
	checks = document.querySelectorAll(`input[type="checkbox"]`);
	var webapp = document.getElementById("webapp");
	trueChecks = [];
	for(var i=0; i<checks.length; i++) 
	{
		if(checks[i].checked == true)
		{
			trueChecks.push(checks[i].id);
		}
	}
	console.log(trueChecks);

	if(trueChecks.length != 0)
	{
		let response = await fetch(heroku+"/test", {
			method: "POST",
			headers: {
					"Content-Type": "application/json"
				},
			body: JSON.stringify({ categories: trueChecks, "username": user })
		});
		let data = await response.json();
		webapp.innerHTML = data.received;
		game_id = data["game_id"];
		console.log(game_id)
		let param = encodeURIComponent(JSON.stringify({"game_id":game_id}))
		console.log(param)
		let questionResponse = await fetch(heroku+`/card?data=${param}`, {
			method: "GET",
			headers: {
					"Content-Type": "application/json"
				}	
		})
		let questData = await questionResponse.json();
		webapp.innerHTML += `<div id=question align=center></div>`;
		var que = document.getElementById("question");
		que.innerHTML = `<button align=center onclick=startCardGame(true)>Start the Game!!!</button>`;
	}
	else
	{
		window.alert("Select a category to play Quivia");
	}
}

async function startCardGame(ti)
{
	let response = await fetch(heroku+"/startcard", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"game_id":game_id})
	});
	let data = await response.json();
	card_1 = data["card_1"];
	card_2 = data["card_2"];
	card_3 = data["card_3"];
	console.log(card_1);
	console.log(card_2);
	console.log(card_3);
	var que = document.getElementById("question");
	que.innerHTML = `<p id="team"></p><div id="time">`+timestring+`</div><h5 id="score">Score: `+score+`</h5><p id="leadin"></p><div align=center><table><tr><td><p class="card" onclick=selectCard(0)><img class="`+card_1[0]+`" src=img/`+card_1[0]+`.png><br>`+card_1[1]+`<br>`+card_1[2]+`</p><td><p class="card" onclick=selectCard(1)><img class="`+card_2[0]+`" src=img/`+card_2[0]+`.png><br>`+card_2[1]+`<br>`+card_2[2]+`</p><td><p class="card" onclick=selectCard(2)><img class="`+card_3[0]+`" src=img/`+card_3[0]+`.png><br>`+card_3[1]+`<br>`+card_3[2]+`</p></tr></table></div>`;
	if(ti) setCountdown();
}

async function selectCard(id) {

    const canPick = (myRole === "picker" || myRole === "both");

    if (!canPick) {
        console.warn("You are not allowed to pick a card (answerer role).");
        return;
    }

    const dispTeam = document.getElementById("team");
    let team = dispTeam.innerHTML;
    question_id = 0;

    switch(id) {
        case 0:
            question_id = card_1[3];
            break;
        case 1:
            question_id = card_2[3];
            break;
        case 2:
            question_id = card_3[3];
            break;
    }

    let response = await fetch(heroku + "/pickcard", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "card": id,
            "game_id": game_id,
            "question_id": question_id,
            "team": team
        })
    });

    let data = await response.json();
    console.log(data["question"]);

    categoryTemp = data["question"]["category"];

    var webapp = document.getElementById("webapp");

    if (typeof data.leadin === undefined || data.leadin === null) {
        question.leadin = "";
    }

    webapp.innerHTML = `
        <p id="team">${team}</p>
        <div id="time"></div>
        <h5 id="score">Score: ${score}</h5>
        <p id="leadin">${data["question"].leadin}</p>
        <p>${data["question"].question}</p>
    `;

    displayAns(data, webapp);

    var sco = document.getElementById("score");
    sco.innerHTML = "Score: " + score;
}

async function startGame()
{
	let response = await fetch(heroku+"/start", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"question": 1,"game_id":game_id})
	});
	let data = await response.json();
	var que = document.getElementById("question");
	que.innerHTML = `<p id="team"></p><div id="time">`+timestring+`</div><h5 id="score"></h5><p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
	displayAns(data, que);
	var sco = document.getElementById("score");
	sco.innerHTML = "Score: "+score;
	setCountdown();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Display answers as buttons
function displayAns(data, que) {
    let distractorsArray = getDistractors(data);
	console.log(data["question"].correct_answer);
	console.log(distractorsArray);
	correct = {"text": data["question"].correct_answer, "explanation": "Correct!"};
	let answers = [correct, ...distractorsArray];
	answers = shuffleArray(answers);
	console.log(answers);

	answers.forEach(ans => {
		let btn = document.createElement("button");
		btn.innerHTML = ans.text;  // use the text property
		btn.onclick = () => selectAnswer(ans, data["question"]._id);
		que.appendChild(btn);
	});
}

function getDistractors(data) {
    return data["question"].incorrect_answers;
}

async function selectAnswer(ans, id) {
    const dispTeam = document.getElementById("team");
	let team = dispTeam.innerHTML;
	const dispLead = document.getElementById("leadin");
	let leadin = dispLead.innerHTML;
	let category = categoryTemp;
	console.log("Selected:", ans.text);
    let response = await fetch(heroku+"/ans", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"answer": ans, "question": id, "game_id": game_id, "team": team, "leadin": leadin, "category": category, "user": user})
    });
    let data = await response.json();
    if (data.status == "correct")
	{
		score += 10;
		correct += 1;
	}
    else
	{
		score -= 5;
		alert(ans.explanation)
	}

    document.getElementById("score").innerHTML = "Score: " + score;
    if (data.team_cards) {
        // Update the UI with new cards
		console.log("Team cards received after answer:", data.team_cards);
        displayTeamCards(data.team_cards, team);
    }
}

async function inputAnswer(answer, data2)
{
	var ansBox = document.getElementById("answerBox"+data2.id);
	id = ansBox.id.replace("answerBox", "");
	console.log("Answer: "+answer);
	console.log("ID: "+id);
	var que = document.getElementById("question");
	let response = await fetch(heroku+"/anstext", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"answer": answer, "question": id, "unformat": data2["unformatted"]})
	});
	let data = await response.json();
	que.innerHTML = `<p id="team"></p><div id="time">`+timestring+`</div><h5 id="score"></h5><p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
	if(data["id"] != "NaN")
	{
		if(data["status"] == "correct")
		{
			score += 10;
			correct += 1;
		}
		else if(data["status"] == "incorrect")
		{
			score -= 5;
		}
		var sco = document.getElementById("score");
		sco.innerHTML = "Score: "+score;
		displayAns(data, que);
	}
	else
	{
		
		starttime = Date.now();
		endtime = Date.now();
		await delay(5000);
		location.reload();
	}
}

async function loadchecklist()
{
	const webapp = document.getElementById("webapp");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "checklist"})
	});
	let data = await response.json();
	webapp.innerHTML = data["html"];
	const logged = document.getElementById("logged");
	console.log(logged);
	if(user.length == 0) logged.innerHTML = `<button onclick=loadlogin()>Login</button><button align=right onclick=loadsignup()>Sign Up</button>`;
	else logged.innerHTML = `<p>`+user+`</p><button align=right onclick=logout()>Log Out</button>`;
	
}

async function loadsignup()
{
	const webapp = document.getElementById("webapp");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "signup"})
	});
	let data = await response.json();
	webapp.innerHTML = data["html"];
}

async function loadlogin()
{
	const webapp = document.getElementById("webapp");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "login"})
	});
	let data = await response.json();
	webapp.innerHTML = data["html"];
}

function signup()
{
	const us = document.getElementById("signup_user1");
	const cu = document.getElementById("signup_user2");
	const em = document.getElementById("signup_email1");
	const ce = document.getElementById("signup_email2");
	const pa = document.getElementById("signup_pass1");
	const cpa = document.getElementById("signup_pass2");
	const username = us.value;
	const conf_username = cu.value;
	const email = em.value;
	const conf_email = ce.value;
	const password = pa.value;
	const conf_password = cpa.value;
	
	var checker = 0;
	
	if (emailFormatted(email)) 
	{
		if (email === conf_email) 
		{
			checker += 4;
		} 
		else 
		{
			alert("Email and confirmation email do not match.");
		}
	}
	else 
	{	
		alert("Invalid email format. Must be username@domain with an allowed TLD.");
	}
	if (usernameFormatted(username)) 
	{
		if (username === conf_username) 
		{
			checker += 2;
		} 
		else 
		{
			alert("Username and confirmation username do not match.");
		}
	} 
	else 
	{
		alert("Invalid username. Usernames can only contain letters and numbers and must include at least one letter.");
	}
	if (passwordFormatted(password)) 
	{
		if (password === conf_password) 
		{
			checker += 1;
		} 
		else 
		{
			alert("Password and confirmation password do not match.");
		}
	} 
	else 
	{
		alert("Invalid password. Passwords must be 8-16 characters, include one uppercase letter, one number, and one special character.");
	}
	if(checker == 7)
	{
		asyncRegister(username, email, password);
	}
}

function emailFormatted(email)
{
    var temp = false;
    var alphabetCheck = false;
	const regex = /^[A-Za-z0-9.-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$/;
	const tlds = [".com", ".net", ".org", ".edu", ".int", ".gov", ".mil"];
    if (!regex.test(email)) {
        return false;
    }
	
	const lowerEmail = email.toLowerCase();
    const hasValidTLD = tlds.some(tld => lowerEmail.endsWith(tld));
    if (!hasValidTLD) {
        return false;
    }
	const username = email.substring(0, email.indexOf("@"));
    if (!/[A-Za-z]/.test(username)) {
        return false;
    }
	
	const domain = email.substring(email.indexOf("@") + 1, email.lastIndexOf("."));
    if (domain.startsWith(".") || domain.startsWith("-") || 
        domain.endsWith(".") || domain.endsWith("-")) {
        return false;
    }

    return true;
}

function usernameFormatted(username) {
    const regex = /^[A-Za-z0-9]+$/;
    if (!regex.test(username)) {
        return false;
    }
    if (!/[A-Za-z]/.test(username)) {
        return false;
    }

    return true;
}

function passwordFormatted(password) {
    if (password.length < 8 || password.length > 16) {
        return false;
    }
    if (!/[A-Z]/.test(password)) {
        return false;
    }
    if (!/[0-9]/.test(password)) {
        return false;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return false;
    }

    return true;
}

async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function asyncRegister(username, email, password)
{
	password = await hashString(password);
	let response = await fetch(heroku+"/register", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"username": username, "email": email, "password": password})
	});
	let data = await response.json();
	
	if(data["status"] == "success")
	{
		
		//alert("Your account has been successfully registered.");
		const webapp = document.getElementById("webapp");
		webapp.innerHTML = `<h1 align=center>Welcome to Quivia!!</h1><h3 align=center>A Quick Team Trivia Game That Tests Your Teammate's Knowledge and Your Ability to Pick the Best Questions!</h3><br><br><h3 align=center>Your account has been successfully registered!! Logging in now.</h3>`;
		user = username;
		const expires = new Date();
        expires.setDate(expires.getDate() + 1);
        document.cookie = `session_token=${data.token}; expires=${expires.toUTCString()}; path=/; Secure; SameSite=Lax`;
		await delay(5000);
        localStorage.setItem("username", username);
		loadmain();
	}
	else if(data["status"] == "no")
	{
		alert("Email or username already registered.");
	}
	else
	{
		alert("I don't know what happened. Server down?");
	}
	
}

async function login()
{
	const us = document.getElementById("login_user");
	const pa = document.getElementById("login_pass");
	const username = us.value;
	var password = pa.value;
	
	password = await hashString(password);
	let response = await fetch(heroku+"/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"username": username, "password": password})
	});
	let data = await response.json();
	
	if(data["status"] == "success")
	{
		//alert("You have successfully logged on.");
		const webapp = document.getElementById("webapp");
		webapp.innerHTML = `<h1 align=center>Welcome to Quivia!!</h1><h3 align=center>A Quick Team Trivia Game That Tests Your Teammate's Knowledge and Your Ability to Pick the Best Questions!</h3><br><br><h3 align=center>You have successfully logged in!!</h3>`;
		user = username;
		const expires = new Date();
        expires.setDate(expires.getDate() + 1);
        document.cookie = `session_token=${data.token}; expires=${expires.toUTCString()}; path=/; Secure; SameSite=Lax`;
		await delay(5000);
        localStorage.setItem("username", username);
		loadmain();
	}
	else if(data["status"] == "incorrect_pass")
	{
		alert("The password you entered is incorrect.");
	}
	else if(data["status"] == "no_user")
	{
		alert("This username does not exist.");
	}
	else
	{
		alert("I don't know what happened. Server down?");
	}
	
}

async function logout()
{
	const token = getCookie("session_token");
	let response = await fetch(heroku+"/logout", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"username": user, "token": token})
	});
	let data = await response.json();
	
	if(data["status"] == "success")
	{
		alert("You have successfully logged off.");
		user = "";
		document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
		loadmain();
	}
	else if(data["status"] == "fail")
	{
		alert("We could not log you out.");
	}
	else
	{
		alert("I don't know what happened. Server down?");
	}
	
}

async function checkCookie()
{
	const token = getCookie("session_token");
	
	let response = await fetch(heroku+"/session", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"token": token})
	});
	let data = await response.json();
	
	if(data["status"] == "success")
	{
		user = data["username"];
	}
	console.log(data);
	loadmain();
	
}

function getCookie(name)
{
	const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) return value;
    }
    return null;
}

async function loadmain()
{
	const webapp = document.getElementById("webapp");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "main"})
	});
	let data = await response.json();
	webapp.innerHTML = data["html"];
}

async function host()
{
	if(user == "")
	{
		showHostAlert();
	}
	else
	{
		const webapp = document.getElementById("webapp");
		let response = await fetch(heroku+"/load", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({"file": "host", "username": user})
		});
		let data = await response.json();
		webapp.innerHTML = data["html"];
	}
}

async function loaduser()
{
	const webapp = document.getElementById("webapp");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "user"})
	});
	let data = await response.json();
	webapp.innerHTML = data["html"];
	const loginout = document.getElementById("loginout");
	if(user.length == 0) loginout.innerHTML += `<button class="mainPageButton" onclick="loadlogin()">LOG IN</button>`;
	else loginout.innerHTML += `<button class="mainPageButton" onclick="logout()">LOG OUT</button>`;
}

function playchecklogin()
{
	if(user.length == 0)
	{
		showGuestAlert();
	}
	else joingame();
}

function showGuestAlert() {
  document.getElementById('customAlert').style.display = 'block';
}
function showHostAlert() {
  document.getElementById('customAlert2').style.display = 'block';
}

function createGuest()
{
	var temp = Math.floor(Math.random() * (123456789 - 1 + 1) + 1);
	user="Guest-"+temp;
	joingame();
}

async function setCountdown()
{
	starttime = Date.now();
	endtime = new Date(starttime+lengthoftime);
	while(true)
	{
		var time = document.getElementById("time");
		var currenttime = new Date();
		var delta = endtime.getTime() - currenttime.getTime();
		const hours = Math.floor(delta / 3600000);
		const mins = Math.floor((delta % 3600000) / 60000);
		const secs = Math.floor((delta % 60000) / 1000);
		if (delta <= 0) {
            time.innerHTML = `<p>00:00</p>`;
			timeRanOut();
            break;
        }
		if (hours > 0)
		{
			timestring = `<p>${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</p>`;
		}
		else 
		{
			timestring = `<p>${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</p>`;
		}
		time.innerHTML = timestring;
		if(delta > 0)
		{
			await delay(100);
		}
	}
}
async function timeRanOut()
{
	let webapp = document.getElementById("webapp");
    if(score <= 0)
	{
		webapp.innerHTML = `<p id="team"></p><div id="time"></div>
					 <h5 id="score">Score: ${score}</h5>
                     <p id="leadin"></p>
                     <p>Sorry, you lost :(</p>`;
	}
	else
	{
		webapp.innerHTML = `<p id="team"></p><div id="time"></div>
					 <h5 id="score">Score: ${score}</h5>
                     <p id="leadin"></p>
                     <p>Congrats!! You win<br>YIPPEE!!</p>`;
	}


    document.getElementById("score").innerHTML = "Score: " + score;

    // Show next set of answers
    istarttime = Date.now();
	endtime = Date.now();
    setTimeout(() => location.reload(), 5000);
}

async function joingame()
{
	const webapp = document.getElementById("webapp");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "joingame"})
	});
	let data = await response.json();
	webapp.innerHTML = data["html"];
}

async function joinGame() {
    const code = document.getElementById("game_code").value.trim();
    if (code.length !== 6) {
        document.getElementById('customAlert').style.display = 'block';
        return;
    }

    try {
        let response = await fetch(`${heroku}/connectGame`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, game_code: code })
        });

        const data = await response.json();
        if (data.status === "no") {
            document.getElementById('customAlert').style.display = 'block';
            return;
        }

        game_id = data.game_id;
        const catHTML = data.catdisplay;
        const gameCode = data.code;

        ws = new WebSocket(`${protocol}://${new URL(heroku).host}/ws/${game_id}/${user}`);
        setupWebSocketHandlers();

        await loadlobby(catHTML, gameCode, Object.values(data.players));
		await getLobbyCode();
    } catch (err) {
        console.error("Error joining game:", err);
        document.getElementById('customAlert').style.display = 'block';
    }
}

let lobbyHTMLPromise = null;

async function loadlobby(catHTML, gameCode, players) {
    const webapp = document.getElementById("webapp");

    if (!lobbyLoaded) {
        const response = await fetch(`${heroku}/load`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: "lobby", game_id })
        });
        const data = await response.json();
        webapp.innerHTML = data.html;
        lobbyLoaded = true;
    }

    if (catHTML) {
        const catDisplay = document.getElementById("catdisplay");
        if (catDisplay) catDisplay.innerHTML = catHTML;
		console.log(catDisplay);
    }

    if (gameCode) {
        const codeDisplay = document.getElementById("codedisplay");
        if (codeDisplay) codeDisplay.innerHTML = `<h3>Game Code: ${gameCode}</h3>`;
		console.log(codeDisplay);
    }

    const playerElements = [
        document.getElementById("player1"),
        document.getElementById("player2"),
        document.getElementById("player3"),
        document.getElementById("player4"),
        document.getElementById("player5"),
        document.getElementById("player6"),
        document.getElementById("player7"),
        document.getElementById("player8")
    ];
	
	playerElements.forEach((element, index) => {
        if (!element) return;

        if (players && players[index]) {
            element.textContent = players[index];
        } else {
            element.textContent = "Waiting for player...";
        }
    });
	
	const startgamedisplay = document.getElementById("startGameButtonHolder");
	if(playerElements[0].innerHTML === user)
	{
		startgamedisplay.innerHTML = `<button onclick="startGameTest()">Start Game</button>`;
	}
}

async function loadlobbyHTML() {
    if (lobbyLoaded) return;

    const webapp = document.getElementById("webapp");
    let response = await fetch(`${heroku}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: "lobby", game_id })
    });
    let data = await response.json();
    webapp.innerHTML = data.html;
    lobbyLoaded = true;
}

async function populateLobby(catHTML, gameCode, players) {
    await loadlobbyHTML();

    const catdisplay = document.getElementById("catdisplay");
    const codedisplay = document.getElementById("codedisplay");

    if (catdisplay) catdisplay.innerHTML = catHTML;
    if (codedisplay) codedisplay.innerHTML = `<h3>Game Code: ${gameCode}</h3>`;

    loadlobby(null, players); // update only players
}


async function submitLobbyParams() {
    const minutes = parseInt(document.getElementById("minutesInput").value);
    if (isNaN(minutes) || minutes < 0) return alert("Enter valid minutes");

    const checks = Array.from(document.querySelectorAll('input[type="checkbox"]'))
                        .filter(ch => ch.checked)
                        .map(ch => ch.id);
    if (checks.length === 0) return alert("Select a category");

    const response = await fetch(`${heroku}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: checks, username: user, lengthoftime: minutes })
    });
    const data = await response.json();
	console.log("Server response from /test:", data);
    game_id = data.game_id;

    ws = new WebSocket(`${protocol}://${new URL(heroku).host}/ws/${game_id}/${user}`);
    setupWebSocketHandlers();

    await loadlobby(data.received, null, [user]);
	await getLobbyCode();
}

async function createLobby(catHTML, gameCode, players) {
    const webapp = document.getElementById("webapp");

    if (!document.getElementById("lobby-container")) {
        let response = await fetch(heroku + "/load", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: "lobby", game_id })
        });
        let data = await response.json();
        webapp.innerHTML = data.html;
    }

    const catdisplay = document.getElementById("catdisplay");
    if (catdisplay && catHTML) catdisplay.innerHTML = catHTML;

    const codedisplay = document.getElementById("codedisplay");
    if (codedisplay && gameCode) codedisplay.innerHTML = `<h3>Game Code: ${gameCode}</h3>`;

	
	
    loadlobby(null, null, players);

    ws = new WebSocket(`${protocol}://${new URL(heroku).host}/ws/${game_id}/${user}`);
    setupWebSocketHandlers();
}

async function getLobbyCode() {
    const codedisplay = document.getElementById("codedisplay");
    if (!codedisplay) {
        console.error("Lobby HTML not loaded yet. Cannot set game code.");
        return;
    }

    try {
        let response = await fetch(heroku + "/getcode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game_id })
        });
        let data = await response.json();
        codedisplay.innerHTML = `<h3>Game Code: ${data.code}</h3>`;
    } catch (err) {
        console.error("Error fetching game code:", err);
    }
}

function handleWSMessage(event) {
    const data = JSON.parse(event.data);

    if (data.type === "players_update") {
        const playerElements = [
            document.getElementById("player1"),
            document.getElementById("player2"),
            document.getElementById("player3"),
            document.getElementById("player4")
        ];
        data.players.forEach((player, index) => {
            if (playerElements[index]) playerElements[index].textContent = player;
        });
    }
}

function setupWebSocketHandlers() {
    if (!ws) return;

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === "players_update") {
            // This is called when the full player list is broadcast
            loadlobby(null, null, data.players);
        }
        
        if (data.type === "player_disconnected") {
            // A regular player left - refresh the lobby
            console.log(`Player ${data.username} disconnected`);
            loadlobby(null, null, data.players);
        }
        
        if (data.type === "start_game") {
            const webapp = document.getElementById("webapp");
            webapp.innerHTML = `<p id="team"></p><div id="time"></div><h5 id="score">`+score+`</h5><p id="leadin"></p><div align=center><div id="cards"></div></div>`;
        }
        
        if (data.type === "host_disconnected") {
            alert(data.message || "The host has disconnected. The lobby is closed.");
            ws.close();
            window.location.href = "/FrontEnd/";
        }
        
        if (data.type === "timer_update") {
            const timerDiv = document.getElementById("time");
            if (timerDiv) {
                timerDiv.innerHTML = `<p>${data.time}</p>`;
            }
        }
        
        if (data.type === "timer_end") {
            document.getElementById("time").innerHTML = `<p>00:00</p>`;
            timeRanOut();
        }
		
		if (data.type === "team_cards") {
			console.log(`Received cards for ${data.team}:`, data.cards);
			displayTeamCards(data.cards, data.team);
		}
		if (data.type === "teams_assigned") {
			const teams = data.teams;

			myTeam = null;
			myRole = null;
			let index = 0;
			for (const [teamName, members] of Object.entries(teams)) {
				if (members.includes(user)) {
					myTeam = { name: teamName, members: members };
					index = members.indexOf(user);
					if (members.length === 1) myRole = "both";
					else if (index === 0) myRole = "picker";
					else myRole = "answerer";
				}
			}
			console.log("My team:", myTeam);
		}
    };

    ws.onopen = function() {
        console.log("WebSocket connection established for game:", game_id);
        heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000);
    };

    ws.onclose = function() {
        console.log("WebSocket closed");
        clearInterval(heartbeatInterval);
    };

    ws.onerror = function(err) {
        console.error("WebSocket error:", err);
    };
}

function leaveGame()
{
	ws.close();
	location.reload();
}

function closeAlert2()
{
	document.getElementById('customAlert2').style.display = 'none';
}

async function startGameTest()
{
	ws.send(JSON.stringify({ type: "assign_teams" }));
	ws.send(JSON.stringify({ type: "start_game" }));
}

function displayTeamCards(cards, team) {
    const webapp = document.getElementById("webapp");
    webapp.innerHTML = `<p id="team"></p><div id="time"></div><h5 id="score">Score: `+score+`</h5><p id="leadin"></p><div align=center><div id="cards"></div></div>`;
    
    const dispTeam = document.getElementById("team");
    dispTeam.innerHTML = team;

    const dispCards = document.getElementById("cards");
    if (!dispCards) return;

    console.log("displayTeamCards "+ cards)

    card_1 = cards[0];
    card_2 = cards[1];
    card_3 = cards[2];

    const isAnswerer = myRole.includes("answerer");
    const clickable = myRole.includes("picker") || myRole.includes("both");

    function buildCard(card, index) {
        const identifier = card[0];
        const category = card[1];
        const difficulty = card[2];
        
        const difficultyText = isAnswerer ? "" : `<br>${difficulty}`;

        const onclick = clickable ? `onclick="selectCard(${index})"` : "";
		
		const disabled = isAnswerer ? "": "disabled-card";

        return `
        <td>
            <p class="card ${disabled}" ${onclick}>
                <img class="${identifier}" src="img/${identifier}.png"><br>
                ${category}
                ${difficultyText}
            </p>
        </td>`;
    }

    let html = `
        <table>
            <tr>
                ${buildCard(card_1, 0)}
                ${buildCard(card_2, 1)}
                ${buildCard(card_3, 2)}
            </tr>
        </table>
    `;

    dispCards.innerHTML = html;
}


document.addEventListener("DOMContentLoaded", () => {
   if (sessionStorage.getItem("reloaded") === "true") {
	sessionStorage.removeItem("reloaded");
   }
   checkCookie();
});

window.addEventListener("beforeunload", () => {
  sessionStorage.setItem("reloaded", "true");
  
});


