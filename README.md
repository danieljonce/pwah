> [!WARNING]
> 1) This is a proof of concept that, at its current stage, knowingly violates the ["Different Origins" PWA best practice]([https://web.dev/articles/building-multiple-pwas-on-the-same-domain](https://web.dev/articles/building-multiple-pwas-on-the-same-domain#using_the_same_origin)). Only install apps you trust and keep in mind if you wipe data for the pway.io origin, you lose all your other apps data too.
> 2) Even though your app and its data lives on your phone, pwah is a public app that wraps it. This means I could make a change to this code that could make your personal apps inaccessible to you. One way around this is to fork this repository and host it from GitHub pages yourself so there's no unexpected code changes.

# Personal Web App Host. PWAH! You've got an app.
This project uses the ["Progressive Web App"](https://web.dev/explore/progressive-web-apps) technology built into most browsers to quickly make a PWA you can host on your personal device. Your created app and its associated data are stored directly on your device using the browser's local storage, are not available to the public, and not stored on a web server.

# What
It's a bit meta. This is a **public** web app that lets users quickly put **personal** web apps on their phone, tablet, or computer, no app stores required. It's mostly for testing, prototyping, and development. Or perhaps quickly making a single page custom app for a birthday party or game night.

# Why
With LLMs like DeepSeek, Llama, ChatGPT and Claude, quickly generating one-off, custom, personal apps has become feasable. However, after the code is generated and tweaked, hosting these types of apps with a public web server is often not needed or even desired.

# How
1) [Visit the running app](https://pwah.io) and use the "Add to Home Screen" in iOS or Android to put PWAH on your phone or tablet's homescreen.
2) Exit your browser, find the icon you just placed, open it, you will again see PWAH.
3) Paste in a single page of HTML
4) Click "View App"

> [!TIP]
> When generating your app code with your preferred LLM, use the phrases "Create as a single page of html" and "make it mobile friendly" or similar.

# Try it
https://pwah.io

## Examples
To try it out now, copy and paste one of these example web apps:

### Simple Todo App:

```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Todo List App</title>
  <style>
    /* Universal box-sizing and reset */
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      overscroll-behavior: none;
      overflow-x: hidden;
    }
    body {
      background-color: #f5f5f5;
      font-family: Arial, sans-serif;
      /* Remove extra padding to prevent misalignment */
    }
    .container {
      background: #fff;
      width: calc(100% - 40px); /* Subtracting margin to fit the screen */
      max-width: 500px;
      padding: 1rem 2rem;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      margin: 20px auto; /* Centers horizontally and adds top margin */
    }
    h1 {
      text-align: center;
      margin-bottom: 1rem;
    }
    .input-container {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
    }
    .input-container input[type="text"] {
      flex: 1;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 16px;
    }
    .input-container button {
      padding: 10px;
      margin-left: 5px;
      border: none;
      background: #007BFF;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    .input-container button:hover {
      background: #0056b3;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li {
      padding: 10px;
      border-bottom: 1px solid #ccc;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .todo-item {
      display: flex;
      align-items: center;
      flex: 1;
    }
    .todo-item input[type="checkbox"] {
      margin-right: 10px;
    }
    /* Only cross out the task text */
    .todo-text.completed {
      text-decoration: line-through;
      color: #777;
    }
    /* Delete button styled as an "x" */
    .delete-btn {
      background: transparent;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: red;
      padding: 0 10px;
    }
    .delete-btn:hover {
      color: darkred;
    }
    /* Mobile-friendly adjustments */
    @media (max-width: 600px) {
      .input-container input[type="text"],
      .input-container button {
        font-size: 18px;
      }
      .container {
        padding: 1rem;
        margin: 20px 10px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Todo List</h1>
    <div class="input-container">
      <input type="text" id="todo-input" placeholder="Add a new task">
      <button id="add-btn">Add</button>
    </div>
    <ul id="todo-list"></ul>
  </div>

  <script>
    // Retrieve stored todos from localStorage or initialize an empty array
    let todos = JSON.parse(localStorage.getItem('todos')) || [];

    const todoList = document.getElementById('todo-list');
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');

    // Save todos to localStorage
    function saveTodos() {
      localStorage.setItem('todos', JSON.stringify(todos));
    }

    // Render todos to the UI
    function renderTodos() {
      todoList.innerHTML = '';
      todos.forEach((todo, index) => {
        const li = document.createElement('li');

        const todoItemDiv = document.createElement('div');
        todoItemDiv.className = 'todo-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => {
          todos[index].completed = !todos[index].completed;
          saveTodos();
          renderTodos();
        });

        const span = document.createElement('span');
        span.textContent = todo.text;
        span.className = 'todo-text';
        if (todo.completed) {
          span.classList.add('completed');
        }

        todoItemDiv.appendChild(checkbox);
        todoItemDiv.appendChild(span);
        li.appendChild(todoItemDiv);

        // Delete button styled as an "x" placed to the right of the task
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'x';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => {
          todos.splice(index, 1);
          saveTodos();
          renderTodos();
        });
        li.appendChild(deleteBtn);

        todoList.appendChild(li);
      });
    }

    // Add a new todo item when clicking the add button
    addBtn.addEventListener('click', () => {
      const text = todoInput.value.trim();
      if (text !== '') {
        todos.push({ text: text, completed: false });
        saveTodos();
        renderTodos();
        todoInput.value = '';
        todoInput.focus();
      }
    });

    // Allow adding todos using the Enter key
    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });

    // Initial render of todos on page load
    renderTodos();
  </script>
</body>
</html>

```

### Side Scrolling Space Shooter

```
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <!-- Ensure proper scaling on mobile devices -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Side Scrolling Shooter</title>
  <style>
    body {
      margin: 0;
      background: black;
      color: white;
      font-family: sans-serif;
      text-align: center;
    }
    canvas {
      background: #000;
      display: block;
      margin: 20px auto;
      image-rendering: pixelated;
      border: 2px solid white;
    }
    #controls {
      display: flex;
      justify-content: center;
      margin-top: 10px;
    }
    #controls button,
    #startButton {
      background: #333;
      color: white;
      border: 2px solid white;
      font-size: 16px;
      padding: 10px;
      margin: 0 5px;
      border-radius: 4px;
    }
    /* Make sure the Start button appears on its own line */
    #startButton {
      display: block;
      margin: 10px auto;
      width: 200px;
    }
  </style>
</head>
<body>
  <canvas id="gameCanvas" width="320" height="240"></canvas>
  <!-- This button is used to start or restart the game -->
  <button id="startButton">Start Game</button>
  <div id="controls">
    <button id="upButton">Up</button>
    <button id="shootButton">Shoot</button>
    <button id="downButton">Down</button>
  </div>
  <script>
    // Set up canvas and context
    let canvas = document.getElementById("gameCanvas");
    let ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    
    // Game variables
    let gameState = "start"; // "start", "playing", or "gameover"
    let score = 0;
    let player;
    let bullets = [];
    let enemies = [];
    let keys = {};
    let enemyTimer = 0;
    let enemyInterval = 1000; // enemy spawn every 1000ms

    // Player class – drawn as a simple white pixel-art triangle
    class Player {
      constructor() {
        this.width = 16;
        this.height = 16;
        this.x = 20;
        this.y = canvas.height / 2 - this.height / 2;
        this.speed = 2;
      }
      update() {
        if (keys["ArrowUp"] && this.y > 0) {
          this.y -= this.speed;
        }
        if (keys["ArrowDown"] && this.y + this.height < canvas.height) {
          this.y += this.speed;
        }
      }
      draw() {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Bullet class
    class Bullet {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 2;
        this.speed = 4;
      }
      update() {
        this.x += this.speed;
      }
      draw() {
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }

    // Enemy class – drawn as a red square
    class Enemy {
      constructor() {
        this.width = 16;
        this.height = 16;
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - this.height);
        this.speed = 1.5;
      }
      update() {
        this.x -= this.speed;
      }
      draw() {
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }

    // Reset the game state
    function resetGame() {
      score = 0;
      player = new Player();
      bullets = [];
      enemies = [];
      enemyTimer = 0;
    }

    // Update game objects
    function update(deltaTime) {
      if (gameState === "playing") {
        player.update();
        
        // Update bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          bullets[i].update();
          if (bullets[i].x > canvas.width) {
            bullets.splice(i, 1);
          }
        }
        
        // Update enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
          enemies[i].update();
          if (enemies[i].x + enemies[i].width < 0) {
            enemies.splice(i, 1);
          }
        }
        
        // Bullet-enemy collision detection
        for (let i = enemies.length - 1; i >= 0; i--) {
          for (let j = bullets.length - 1; j >= 0; j--) {
            if (
              bullets[j].x < enemies[i].x + enemies[i].width &&
              bullets[j].x + bullets[j].width > enemies[i].x &&
              bullets[j].y < enemies[i].y + enemies[i].height &&
              bullets[j].y + bullets[j].height > enemies[i].y
            ) {
              enemies.splice(i, 1);
              bullets.splice(j, 1);
              score += 10;
              break;
            }
          }
        }
        
        // Enemy-player collision detection
        for (let enemy of enemies) {
          if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
          ) {
            gameState = "gameover";
            showStartButton();
          }
        }
        
        // Spawn enemies periodically
        enemyTimer += deltaTime;
        if (enemyTimer > enemyInterval) {
          enemies.push(new Enemy());
          enemyTimer = 0;
        }
      }
    }

    // Draw the current game screen
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (gameState === "start") {
        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SIDE SCROLLING SHOOTER", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText("Tap Start Game", canvas.width / 2, canvas.height / 2 + 10);
      } else if (gameState === "playing") {
        player.draw();
        bullets.forEach(bullet => bullet.draw());
        enemies.forEach(enemy => enemy.draw());
        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Score: " + score, 10, 20);
      } else if (gameState === "gameover") {
        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2);
        ctx.fillText("Tap Start Game to Restart", canvas.width / 2, canvas.height / 2 + 20);
      }
    }

    let lastTime = 0;
    // Main game loop
    function gameLoop(timestamp) {
      let deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      update(deltaTime);
      draw();
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);

    // Keyboard controls (for desktop play)
    document.addEventListener("keydown", function(e) {
      keys[e.key] = true;
      if (gameState === "playing" && e.key === " ") {
        bullets.push(new Bullet(player.x + player.width, player.y + player.height / 2 - 1));
      }
    });
    document.addEventListener("keyup", function(e) {
      keys[e.key] = false;
    });

    // Mobile / on-screen controls
    const upButton = document.getElementById("upButton");
    const downButton = document.getElementById("downButton");
    const shootButton = document.getElementById("shootButton");
    const startButton = document.getElementById("startButton");

    // Up button events
    upButton.addEventListener("touchstart", function(e) {
      e.preventDefault();
      keys["ArrowUp"] = true;
    });
    upButton.addEventListener("touchend", function(e) {
      e.preventDefault();
      keys["ArrowUp"] = false;
    });
    upButton.addEventListener("mousedown", function(e) {
      e.preventDefault();
      keys["ArrowUp"] = true;
    });
    upButton.addEventListener("mouseup", function(e) {
      e.preventDefault();
      keys["ArrowUp"] = false;
    });

    // Down button events
    downButton.addEventListener("touchstart", function(e) {
      e.preventDefault();
      keys["ArrowDown"] = true;
    });
    downButton.addEventListener("touchend", function(e) {
      e.preventDefault();
      keys["ArrowDown"] = false;
    });
    downButton.addEventListener("mousedown", function(e) {
      e.preventDefault();
      keys["ArrowDown"] = true;
    });
    downButton.addEventListener("mouseup", function(e) {
      e.preventDefault();
      keys["ArrowDown"] = false;
    });

    // Shoot button events
    shootButton.addEventListener("click", function(e) {
      e.preventDefault();
      if (gameState === "playing") {
        bullets.push(new Bullet(player.x + player.width, player.y + player.height / 2 - 1));
      }
    });
    shootButton.addEventListener("touchstart", function(e) {
      e.preventDefault();
      if (gameState === "playing") {
        bullets.push(new Bullet(player.x + player.width, player.y + player.height / 2 - 1));
      }
    });

    // Start/Restart button events
    startButton.addEventListener("click", function(e) {
      e.preventDefault();
      if (gameState === "start" || gameState === "gameover") {
        resetGame();
        gameState = "playing";
        hideStartButton();
      }
    });
    startButton.addEventListener("touchstart", function(e) {
      e.preventDefault();
      if (gameState === "start" || gameState === "gameover") {
        resetGame();
        gameState = "playing";
        hideStartButton();
      }
    });

    function showStartButton() {
      startButton.style.display = "block";
    }
    function hideStartButton() {
      startButton.style.display = "none";
    }

    // At load time, show the Start button
    showStartButton();
  </script>
</body>
</html>

```
