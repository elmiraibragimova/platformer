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


const otherSprites = document.createElement('img');
otherSprites.src = 'img/sprites.png';

const playerSprites = document.createElement('img');
playerSprites.src = 'img/player.png';
const playerXOverlap = 4;

function flipHorizontally(context, around) {
  context.translate(around, 0);
  context.scale(-1, 1);
  context.translate(-around, 0);
}

const actorChars = {
  '@': Player,
  'o': Coin,
  '=': Lava, '|': Lava, 'v': Lava
};
