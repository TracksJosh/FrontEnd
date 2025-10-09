const delay = ms => new Promise(res => setTimeout(res, ms));
const heroku="https://quivia-7c117ffa0dd4.herokuapp.com";
//const heroku="http://localhost:8887";
var user = "";
var score = 0;
var correct = 0;
var game_id;

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
	checks = document.getElementsByTagName("input");
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
		let questionResponse = await fetch(heroku+`/question?data=${param}`, {
			method: "GET",
			headers: {
					"Content-Type": "application/json"
				}	
		})
		let questData = await questionResponse.json();
		webapp.innerHTML += `<div id=question align=center></div>`;
		var que = document.getElementById("question");
		que.innerHTML = `<button align=center onclick=startGame()>Start the Game!!!</button>`;
	}
	else
	{
		window.alert("Select a category to play Quivia");
	}
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
	que.innerHTML = `<h5 id="score"></h5><p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
	displayAns(data, que);
	var sco = document.getElementById("score");
	sco.innerHTML = "Score: "+score;
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
	console.log(data.answer);
	console.log(distractorsArray);
	let answers = [data.answer, ...distractorsArray];
	answers = shuffleArray(answers);

	answers.forEach(ans => {
		let btn = document.createElement("button");
		btn.innerHTML = ans.text;  // use the text property
		btn.onclick = () => selectAnswer(ans, data.id, que);
		que.appendChild(btn);
	});
}

function getDistractors(data) {
    if (Array.isArray(data.distractors)) return data.distractors;
    if (Array.isArray(data.distractors?.distractors)) return data.distractors.distractors;
    return [];
}

async function selectAnswer(ans, id) {
    console.log("Selected:", ans.text);
    let response = await fetch(heroku+"/ans", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"answer": ans, "question": id, "game_id": game_id})
    });
    let data = await response.json();

    // Update question and lead-in
    let que = document.getElementById("question");
    que.innerHTML = `<h5 id="score">Score: ${score}</h5>
                     <p id="leadin">${data.leadin}</p>
                     <p>${data.question}</p>`;

    // Update score
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

    // Show next set of answers
    if (data.id != "NaN") {
        displayAns(data, que);
    } else {
        // End of quiz
        setTimeout(() => location.reload(), 5000);
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
	que.innerHTML = `<h5 id="score"></h5><p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
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
		
		await delay(5000);
		location.reload();
	}
}

async function loadchecklist()
{
	const body = document.getElementById("body");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "checklist"})
	});
	let data = await response.json();
	body.innerHTML = data["html"];
	const logged = document.getElementById("logged");
	console.log(logged);
	if(user.length == 0) logged.innerHTML = `<button onclick=loadlogin()>Login</button><button align=right onclick=loadsignup()>Sign Up</button>`;
	else logged.innerHTML = `<p>`+user+`</p><button align=right onclick=logout()>Log Out</button>`;
	
}

async function loadsignup()
{
	const body = document.getElementById("body");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "signup"})
	});
	let data = await response.json();
	body.innerHTML = data["html"];
}

async function loadlogin()
{
	const body = document.getElementById("body");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "login"})
	});
	let data = await response.json();
	body.innerHTML = data["html"];
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
		const body = document.getElementById("body");
		body.innerHTML = `<h1 align=center>Welcome to Quivia!!</h1><h3 align=center>A Quick Team Trivia Game That Tests Your Teammate's Knowledge and Your Ability to Pick the Best Questions!</h3><br><br><h3 align=center>Your account has been successfully registered!! Logging in now.</h3>`;
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
		const body = document.getElementById("body");
		body.innerHTML = `<h1 align=center>Welcome to Quivia!!</h1><h3 align=center>A Quick Team Trivia Game That Tests Your Teammate's Knowledge and Your Ability to Pick the Best Questions!</h3><br><br><h3 align=center>You have successfully logged in!!</h3>`;
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
	const body = document.getElementById("body");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "main"})
	});
	let data = await response.json();
	body.innerHTML = data["html"];
}

function host()
{
	window.alert("The hosting function has not been implemented.");
}

async function loaduser()
{
	const body = document.getElementById("body");
	let response = await fetch(heroku+"/load", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"file": "user"})
	});
	let data = await response.json();
	body.innerHTML = data["html"];
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

function createGuest()
{
	var temp = Math.floor(Math.random() * (123456789 - 1 + 1) + 1);
	user="Guest-"+temp;
	loadchecklist();
}

document.addEventListener("DOMContentLoaded", () => {
   checkCookie();
});

