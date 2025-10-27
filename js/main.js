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
	que.innerHTML = `<div id="time">`+timestring+`</div><h5 id="score">Score: `+score+`</h5><p id="leadin"></p><div align=center><table><tr><td><p class="card" onclick=selectCard(0)><img class="`+card_1[0]+`" src=img/`+card_1[0]+`.png><br>`+card_1[1]+`<br>`+card_1[2]+`</p><td><p class="card" onclick=selectCard(1)><img class="`+card_2[0]+`" src=img/`+card_2[0]+`.png><br>`+card_2[1]+`<br>`+card_2[2]+`</p><td><p class="card" onclick=selectCard(2)><img class="`+card_3[0]+`" src=img/`+card_3[0]+`.png><br>`+card_3[1]+`<br>`+card_3[2]+`</p></tr></table></div>`;
	if(ti) setCountdown();
}

async function selectCard(id)
{
	
	question_id = 0;
	switch(id)
	{
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
	let response = await fetch(heroku+"/pickcard", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"card":id, "game_id":game_id, "question_id":question_id})
	});
	let data = await response.json();
	console.log(data["question"]);
	var que = document.getElementById("question");
	if (typeof data.leadin === undefined || data.leadin === null) 
	{
		question.leadin = "";
	}
	que.innerHTML = `<div id="time">`+timestring+`</div><h5 id="score"></h5><p id="leadin">`+data["question"].leadin+`</p><p>`+data["question"].question+`</p>`;
	displayAns(data, que);
	var sco = document.getElementById("score");
	sco.innerHTML = "Score: "+score;
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
	que.innerHTML = `<div id="time">`+timestring+`</div><h5 id="score"></h5><p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
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
    console.log("Selected:", ans.text);
    let response = await fetch(heroku+"/ans", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"answer": ans, "question": id, "game_id": game_id})
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
    startCardGame(false);
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
	que.innerHTML = `<div id="time">`+timestring+`</div><h5 id="score"></h5><p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
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
	else loadchecklist();
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
	loadchecklist();
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
	let que = document.getElementById("question");
    if(score <= 0)
	{
		que.innerHTML = `<div id="time">`+timestring+`</div>
					 <h5 id="score">Score: ${score}</h5>
                     <p id="leadin"></p>
                     <p>Sorry, you lost :(</p>`;
	}
	else
	{
		que.innerHTML = `<div id="time">`+timestring+`</div>
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
    }
    if (gameCode) {
        const codeDisplay = document.getElementById("codedisplay");
        if (codeDisplay) codeDisplay.textContent = `Game Code: ${gameCode}`;
    }

    if (players && players.length > 0) {
        const playerElements = [
            document.getElementById("player1"),
            document.getElementById("player2"),
            document.getElementById("player3"),
            document.getElementById("player4")
        ];
        players.forEach((player, index) => {
            if (player && playerElements[index]) {
                playerElements[index].textContent = player;
            }
        });
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
    const checks = Array.from(document.querySelectorAll('input[type="checkbox"]'))
                         .filter(ch => ch.checked)
                         .map(ch => ch.id);
    if (isNaN(minutes) || minutes < 0 || checks.length === 0) return;
	
    let response = await fetch(`${heroku}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: checks, username: user, lengthoftime: minutes })
    });
    const data = await response.json();
    game_id = data.game_id;
    const catHTML = data.catdisplay;
    const gameCode = data.code;

    let loadResponse = await fetch(`${heroku}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: "lobby", game_id })
    });
    const loadData = await loadResponse.json();
    document.getElementById("webapp").innerHTML = loadData.html;

    document.getElementById("catdisplay").innerHTML = catHTML;
    document.getElementById("codedisplay").textContent = `Game Code: ${gameCode}`;

    await loadlobby(null, null, [user]);

    ws = new WebSocket(`${protocol}://${new URL(heroku).host}/ws/${game_id}/${user}`);
    setupWebSocketHandlers();
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
    if (!ws) return; // exit if ws is not created yet

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === "players_update") {
            loadlobby(null, null, data.players); // only update players
        }
    };

    ws.onopen = function() {
        console.log("WebSocket connection established for game:", game_id);
    };

    ws.onclose = function() {
        console.log("WebSocket closed");
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

document.addEventListener("DOMContentLoaded", () => {
   if (sessionStorage.getItem("reloaded") === "true") {
	sessionStorage.removeItem("reloaded");
   }
   checkCookie();
});

window.addEventListener("beforeunload", () => {
  sessionStorage.setItem("reloaded", "true");
  
});


