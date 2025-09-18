const delay = ms => new Promise(res => setTimeout(res, ms));
const heroku="https://quivia-7c117ffa0dd4.herokuapp.com";
//const heroku="http://localhost:8887";
var user = "";

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
			body: JSON.stringify({ categories: trueChecks })
		});
		let data = await response.json();
		webapp.innerHTML = data.received;
		
		let questionResponse = await fetch(heroku+"/question", {
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
			body: JSON.stringify({"question": 1})
	});
	let data = await response.json();
	var que = document.getElementById("question");
	que.innerHTML = `<p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
	displayAns(data, que);
}

function displayAns(data, que)
{
	let answers = [data["answer"], ...data["distractors"]];

	// Fisher-Yates shuffle
	for (let i = answers.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[answers[i], answers[j]] = [answers[j], answers[i]];
	}
	
	// Create buttons in randomized order
	answers.forEach(ans => {
		let btn = document.createElement("button");
		btn.id = data["id"];
		btn.innerHTML = ans;
		btn.onclick = () => selectAnswer(ans, data["id"]);
		que.appendChild(btn);
	});
}

async function selectAnswer(ans, id)
{
	console.log("Answer: "+ans);
	var que = document.getElementById("question");
	let response = await fetch(heroku+"/ans", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({"answer": ans, "question": id})
	});
	let data = await response.json();
	que.innerHTML = `<p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
	if(data["id"] != "NaN")
	{
		displayAns(data, que);
	}
	else
	{
		await delay(5000);
		location.reload();
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
	que.innerHTML = `<p id="leadin">`+data["leadin"]+`</p><p>`+data["question"]+`</p>`;
	if(data["id"] != "NaN")
	{
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

document.addEventListener("DOMContentLoaded", () => {
    loadchecklist();
});

