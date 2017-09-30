const arrowCodes = {
  37: 'left',
  38: 'up',
  39: 'right'
};

const scale = 20;
const maxStep = 0.05;
const wobbleSpeed = 8;
const wobbleDist = 0.07;
const gravity = 30;
const jumpSpeed = 17;
const playerXSpeed = 7;

class Level {
  constructor(plan) {
    this.width = plan[0].length;
    this.height = plan.length;
    this.grid = [];
    this.actors = [];

    for (let y = 0; y < this.height; y++) {
      let line = plan[y], gridLine = [];

      for (let x = 0; x < this.width; x++) {
        let ch = line[x], fieldType = null;
        let Actor = actorChars[ch];
        if (Actor) {
          this.actors.push(new Actor(new Vector(x, y), ch));
        } else if (ch == 'x') {
          fieldType = 'wall';
        } else if (ch == '!') {
          fieldType = 'lava';
        }

        gridLine.push(fieldType);
      }
      this.grid.push(gridLine);
    }

    this.player = this.actors.filter(actor => {
      return actor.type == 'player';
    })[0];
    this.status = this.finishDelay = null;
  }

  isFinished() {
    return this.status != null && this.finishDelay < 0;
  }

  obstacleAt(pos, size) {
    let xStart = Math.floor(pos.x);
    let xEnd = Math.ceil(pos.x + size.x);
    let yStart = Math.floor(pos.y);
    let yEnd = Math.ceil(pos.y + size.y);

    if (xStart < 0 || xEnd > this.width || yStart < 0) {
      return 'wall';
    }

    if (yEnd > this.height) {
      return 'lava';
    }

    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        let fieldType = this.grid[y][x];
        if (fieldType) {
          return fieldType;
        }
      }
    }
  }

  actorAt(actor) {
    for (let i = 0; i < this.actors.length; i++) {
      let other = this.actors[i];
      if (other != actor &&
          actor.pos.x + actor.size.x > other.pos.x &&
          actor.pos.x < other.pos.x + other.size.x &&
          actor.pos.y + actor.size.y > other.pos.y &&
          actor.pos.y < other.pos.y + other.size.y) {

        return other;
      }
    }
  }

  animate(step, keys) {
    if (this.status != null)
      this.finishDelay -= step;

    while (step > 0) {
      let thisStep = Math.min(step, maxStep);

      // maybe doesn't have to be an arrow function?
      this.actors.forEach(actor => {
        actor.act(thisStep, this, keys);
      });
      step -= thisStep;
    }
  }

  playerTouched(type, actor) {
    if (type == 'lava' && this.status == null) {
      this.status = 'lost';
      this.finishDelay = 1;
    } else if (type == 'coin') {
      this.actors = this.actors.filter(other => {
        return other != actor;
      });
      if (!this.actors.some(actor => {
        return actor.type == 'coin';
      })) {
        this.status = 'won';
        this.finishDelay = 1;
      }
    }
  }
}

class Vector {
  constructor(x, y) {
    this.x = x; this.y = y;
  }

  plus(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}


class Player {
  constructor(pos) {
    this.pos = pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0);
    this.type = 'player';
  }

  moveX(step, level, keys) {
    this.speed.x = 0;
    if (keys.left) this.speed.x -= playerXSpeed;
    if (keys.right) this.speed.x += playerXSpeed;

    let motion = new Vector(this.speed.x * step, 0);
    let newPos = this.pos.plus(motion);
    let obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle) {
      level.playerTouched(obstacle);
    } else {
      this.pos = newPos;
    }
  }

  moveY(step, level, keys) {
    this.speed.y += step * gravity;
    let motion = new Vector(0, this.speed.y * step);
    let newPos = this.pos.plus(motion);
    let obstacle = level.obstacleAt(newPos, this.size);

    if (obstacle) {
      level.playerTouched(obstacle);

      if (keys.up && this.speed.y > 0) {
        this.speed.y = -jumpSpeed;
      } else {
        this.speed.y = 0;
      }

    } else {
      this.pos = newPos;
    }
  }

  act(step, level, keys) {
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    let otherActor = level.actorAt(this);
    if (otherActor) {
      level.playerTouched(otherActor.type, otherActor);
    }

    if (level.status == 'lost') {
      this.pos.y += step;
      this.size.y -= step;
    }
  }
}

class Lava {
  constructor(pos, ch) {
    this.pos = pos;
    this.size = new Vector(1, 1);
    this.type = 'lava';
    if (ch == '=') {
      this.speed = new Vector(2, 0);
    } else if (ch == '|') {
      this.speed = new Vector(0, 2);
    } else if (ch == 'v') {
      this.speed = new Vector(0, 3);
      this.repeatPos = pos;
    }
  }

  act(step, level) {
    let newPos = this.pos.plus(this.speed.times(step));
    if (!level.obstacleAt(newPos, this.size)) {
      this.pos = newPos;
    } else if (this.repeatPos) {
      this.pos = this.repeatPos;
    } else {
      this.speed = this.speed.times(-1);
    }
  }
}

class Coin {
  constructor(pos) {
    this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
    this.size = new Vector(0.6, 0.6);
    this.wobble = Math.random() * Math.PI * 2;
    this.type = 'coin';
  }

  act(step) {
    this.wobble += step * wobbleSpeed;
    let wobblePos = Math.sin(this.wobble) * wobbleDist;
    this.pos = this.basePos.plus(new Vector(0, wobblePos));
  }
}

function trackKeys(codes) {
  let pressed = Object.create(null);

  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      let down = event.type == 'keydown';
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
  addEventListener('keydown', handler);
  addEventListener('keyup', handler);
  return pressed;
}

function runAnimation(frameFunc) {
  let lastTime = null;

  function frame(time) {
    let stop = false;
    if (lastTime != null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      stop = frameFunc(timeStep) === false;
    }

    lastTime = time;
    if (!stop) {
      requestAnimationFrame(frame);
    }
  }
  requestAnimationFrame(frame);
}

const arrows = trackKeys(arrowCodes);

function runLevel(level, Display, andThen) {
  let display = new Display(document.body, level);

  runAnimation(step => {
    level.animate(step, arrows);
    display.drawFrame(step);
    if (level.isFinished()) {
      display.clear();

      if (andThen) {
        andThen(level.status);
      }

      return false;
    }
  });
}

function runGame(plans, Display) {
  function startLevel(n) {
    runLevel(new Level(plans[n]), Display, status => {
      if (status == 'lost') {
        startLevel(n);
      } else if (n < plans.length - 1) {
        startLevel(n + 1);
      } else {
        console.log('You win!');
      }
    });
  }
  startLevel(0);
}

const actorChars = {
  '@': Player,
  'o': Coin,
  '=': Lava, '|': Lava, 'v': Lava
};

const otherSprites = document.createElement('img');
otherSprites.src = 'imgages/sprites.png';

const playerSprites = document.createElement('img');
playerSprites.src = 'imgages/player.png';
const playerXOverlap = 4;

function flipHorizontally(context, around) {
  context.translate(around, 0);
  context.scale(-1, 1);
  context.translate(-around, 0);
}

class CanvasDisplay {
  constructor(parent, level) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.min(600, level.width * scale);
    this.canvas.height = Math.min(450, level.height * scale);
    parent.appendChild(this.canvas);
    this.cx = this.canvas.getContext('2d');

    this.level = level;
    this.animationTime = 0;
    this.flipPlayer = false;

    this.viewport = {
      left: 0,
      top: 0,
      width: this.canvas.width / scale,
      height: this.canvas.height / scale
    };

    this.drawFrame(0);
  }

  clear() {
    this.canvas.parentNode.removeChild(this.canvas);
  }

  drawFrame(step) {
    this.animationTime += step;

    this.updateViewport();
    this.clearDisplay();
    this.drawBackground();
    this.drawActors();
  }

  updateViewport() {
    let view = this.viewport;
    let margin = view.width / 3;
    let player = this.level.player;
    let center = player.pos.plus(player.size.times(0.5));

    if (center.x < view.left + margin) {
      view.left = Math.max(center.x - margin, 0);
    } else if (center.x > view.left + view.width - margin) {
      view.left = Math.min(center.x + margin - view.width, this.level.width - view.width);
    }

    if (center.y < view.top + margin) {
      view.top = Math.max(center.y - margin, 0);
    } else if (center.y > view.top + view.height - margin) {
      view.top = Math.min(center.y + margin - view.height, this.level.height - view.height);
    }
  }

  clearDisplay() {
    if (this.level.status == 'won') {
      this.cx.fillStyle = 'rgb(68, 191, 255)';
    } else if (this.level.status == 'lost') {
      this.cx.fillStyle = 'rgb(44, 136, 214)';
    } else {
      this.cx.fillStyle = 'rgb(52, 166, 251)';
    }

    this.cx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground() {
    let view = this.viewport;
    let xStart = Math.floor(view.left);
    let xEnd = Math.ceil(view.left + view.width);
    let yStart = Math.floor(view.top);
    let yEnd = Math.ceil(view.top + view.height);

    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        let tile = this.level.grid[y][x];

        if (tile == null) continue;

        let screenX = (x - view.left) * scale;
        let screenY = (y - view.top) * scale;
        let tileX = tile == 'lava' ? scale : 0;

        this.cx.drawImage(otherSprites, tileX, 0, scale, scale, screenX, screenY, scale, scale);
      }
    }
  }

  drawPlayer(x, y, width, height) {
    let sprite = 8;
    let player = this.level.player;
    width += playerXOverlap * 2;
    x -= playerXOverlap;
    if (player.speed.x != 0) {
      this.flipPlayer = player.speed.x < 0;
    }

    if (player.speed.y != 0) {
      sprite = 9;
    } else if (player.speed.x != 0) {
      sprite = Math.floor(this.animationTime * 12) % 8;
    }

    this.cx.save();
    if (this.flipPlayer) {
      flipHorizontally(this.cx, x + width / 2);
    }

    this.cx.drawImage(playerSprites, sprite * width, 0, width, height, x, y, width, height);
    this.cx.restore();
  }

  drawActors() {
    this.level.actors.forEach(actor => {
      let width = actor.size.x * scale;
      let height = actor.size.y * scale;
      let x = (actor.pos.x - this.viewport.left) * scale;
      let y = (actor.pos.y - this.viewport.top) * scale;
      if (actor.type == 'player') {
        this.drawPlayer(x, y, width, height);
      } else {
        let tileX = (actor.type == 'coin' ? 2 : 1) * scale;
        this.cx.drawImage(otherSprites, tileX, 0, width, height, x, y, width, height);
      }
    }, this);
  }
}
