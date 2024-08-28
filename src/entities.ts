import {
	KaboomCtx,
	GameObj,
	AreaComp,
	BodyComp,
	DoubleJumpComp,
	HealthComp,
	OpacityComp,
	PosComp,
	ScaleComp,
	SpriteComp,
} from "kaboom";
import { scale } from "./constants";

type PlayerGameObj = GameObj<
	SpriteComp &
		AreaComp &
		BodyComp &
		PosComp &
		ScaleComp &
		DoubleJumpComp &
		HealthComp &
		OpacityComp & {
			speed: number;
			direction: string;
			isInhaling: boolean;
			isFull: boolean;
		}
>;

export function makePlayer(k: KaboomCtx, posX: number, posY: number) {
	const player = k.make([
		k.sprite("assets", { anim: "kirbIdle" }),
		k.area({ shape: new k.Rect(k.vec2(4, 5.9), 8, 10) }),
		k.body(),
		k.pos(posX * scale, posY * scale),
		k.scale(scale),
		k.doubleJump(10), // allows 10 jumps
		k.health(3), // 3 health
		k.opacity(1), // 1 means fully visit
		{
			speed: 300,
			direction: "right",
			isInhaling: false,
			isFull: false,
		},
		"player",
	]);

	player.onCollide("enemy", async (enemy: GameObj) => {
		if (player.isInhaling && enemy.isInhalable) {
			player.isInhaling = false;
			k.destroy(enemy);
			player.isFull = true;
			return;
		}

		if (player.hp() === 0) {
			k.destroy(player);
			k.go("level-1");
			return;
		}

		player.hurt();
		// blinking effect of the player
		await k.tween(
			player.opacity,
			0,
			0.05,
			(val) => (player.opacity = val),
			k.easings.linear,
		);
		await k.tween(
			player.opacity,
			1,
			0.05,
			(val) => (player.opacity = val),
			k.easings.linear,
		);
	});

	player.onCollide("exit", () => {
		k.go("level-2");
	});

	// the inhaling effect
	const inhaleEffect = k.add([
		k.sprite("assets", { anim: "kirbInhaleEffect" }),
		k.pos(),
		k.scale(scale),
		k.opacity(0),
		"inhaleEffect",
	]);

	const inhaleZone = player.add([
		k.area({ shape: new k.Rect(k.vec2(0), 20, 4) }),
		k.pos(),
		"inhaleZone",
	]);

	inhaleZone.onUpdate(() => {
		if (player.direction === "left") {
			inhaleZone.pos = k.vec2(-14, 8); // relative to the player (which is the parent)
			inhaleEffect.pos = k.vec2(player.pos.x - 60, player.pos.y + 0);
			inhaleEffect.flipX = true; // animation is drawn from the right side, we need it to be flipped
			return;
		}
		// for facing right
		inhaleZone.pos = k.vec2(14, 8);
		inhaleEffect.pos = k.vec2(player.pos.x + 60, player.pos.y + 0);
		inhaleEffect.flipX = false;
	});

	player.onUpdate(() => {
		// if player falls and exceeds 2000, it will respawn the player
		if (player.pos.y > 2000) {
			k.go("level-1");
		}
	});

	return player;
}

export function setControls(k: KaboomCtx, player: PlayerGameObj) {
	const inhaleEffectRef = k.get("inhaleEffect")[0];

	k.onKeyDown((key) => {
		switch (key) {
			case "left":
				player.direction = "left";
				player.flipX = true;
				player.move(-player.speed, 0); // player.speed for x and 0 for y
				break;
			case "right":
				player.direction = "right";
				player.flipX = false;
				player.move(player.speed, 0); // player.speed for x and 0 for y
				break;
			case "z":
				if (player.isFull) {
					player.play("kirbFull");
					inhaleEffectRef.opacity = 0; // invisible
					break;
				}

				player.isInhaling = true;
				player.play("kirbInhaling");
				inhaleEffectRef.opacity = 1;
				break;
			default:
		}
	});

	// On x, kirby can double jump
	k.onKeyPress((key) => {
		if (key == "x") {
			player.doubleJump();
		}
	});

	k.onKeyRelease((key) => {
		if (key == "z") {
			if (player.isFull) {
				player.play("kirbInhaling");
				const shootingStar = k.add([
					k.sprite("assets", {
						anim: "shootingStar",
						flipX: player.direction === "right",
					}),
					k.area({ shape: new k.Rect(k.vec2(5, 4), 6, 6) }),
					k.pos(
						player.direction === "left" ? player.pos.x - 80 : player.pos.x + 80,
						player.pos.y + 5,
					),
					k.scale(scale),
					player.direction === "left" ? k.move(k.LEFT, 800) : k.move(k.RIGHT, 800),
					"shootingStar",
				]);
				shootingStar.onCollide("platform", () => k.destroy(shootingStar));

				player.isFull = false; // kirby shot the star, so now they can swallow someone again
				k.wait(1, () => player.play("kirbIdle"));
				return;
			}

			inhaleEffectRef.opacity = 0; // kirby is done inhaling so we hide the effect
			player.isInhaling = false;
			player.play("kirbIdle");
		}
	});
}

export function makeInhalable(k: KaboomCtx, enemy: GameObj) {
	// when enemy is in inhale zone then, the enemy can be inhaled
	enemy.onCollide("inhaleZone", () => {
		enemy.isInhalable = true;
	});

	// when enemy is not in the inhale zone, then the enemy cannot be inhaled
	enemy.onCollideEnd("inhaleZone", () => {
		enemy.isInhalable = false;
	});

	// when shooting star hits the enemy, it destroys the enemy and the shooting star
	enemy.onCollide("shootingStar", (shootingStar: GameObj) => {
		k.destroy(enemy);
		k.destroy(shootingStar);
	});

	const playerRef = k.get("player")[0];
	enemy.onUpdate(() => {
		if (playerRef.isInhaling && enemy.isInhalable) {
			if (playerRef.direction === "right") {
				enemy.move(-800, 0); // make the enemy move to the left with 800 speed
				return;
			}
			enemy.move(800, 0); // make the enemy move to the right with 800 speed
		}
	});
}

export function makeFlameEnemy(k: KaboomCtx, posX: number, posY: number) {
	const flame = k.add([
		k.sprite("assets", { anim: "flame" }),
		k.scale(scale),
		k.pos(posX * scale, posY * scale),
		k.area({
			shape: new k.Rect(k.vec2(4, 6), 8, 10),
			collisionIgnore: ["enemy"], // enemies can't collide with other enemies
		}),
		k.body(),
		k.state("idle", ["idle", "jump"]), // adds enemy tag, default state is idle
		{ isInhalable: false, speed: 100 },
		"enemy",
	]);

	makeInhalable(k, flame);

	// it jumps, waits 1 second, then jumps again
	flame.onStateEnter("idle", async () => {
		await k.wait(1);
		flame.enterState("jump");
	});

	flame.onStateEnter("jump", async () => {
		flame.jump(1000);
	});

	flame.onStateUpdate("jump", async () => {
		if (flame.isGrounded()) {
			flame.enterState("idle");
		}
	});

	return flame;
}

export function makeGuyEnemy(k: KaboomCtx, posX: number, posY: number) {
	const guy = k.add([
		k.sprite("assets", { anim: "guyWalk" }),
		k.scale(scale),
		k.pos(posX * scale, posY * scale),
		k.area({
			shape: new k.Rect(k.vec2(4, 6), 8, 10),
			collisionIgnore: ["enemy"], // enemies can't collide with other enemies
		}),
		k.body(),
		// adds enemy tag, default state is idle
		k.state("idle", ["idle", "left", "right"]),
		{ isInhalable: false, speed: 100 },
		"enemy",
	]);

	makeInhalable(k, guy);

	// it jumps, waits 1 second, then jumps again
	guy.onStateEnter("idle", async () => {
		await k.wait(1);
		guy.enterState("left");
	});

	guy.onStateEnter("left", async () => {
		guy.flipX = false;
		await k.wait(2);
		guy.enterState("right");
	});

	guy.onStateUpdate("left", () => {
		guy.move(-guy.speed, 0);
	});

	guy.onStateEnter("right", async () => {
		guy.flipX = true;
		await k.wait(2);
		guy.enterState("left");
	});

	guy.onStateUpdate("right", () => {
		guy.move(guy.speed, 0);
	});

	return guy;
}

export function makeBirdEnemy(k: KaboomCtx, posX: number, posY: number, speed: number) {
	const bird = k.add([
		k.sprite("assets", { anim: "bird" }),
		k.scale(scale),
		k.pos(posX * scale, posY * scale),
		k.area({
			shape: new k.Rect(k.vec2(4, 6), 8, 10),
			collisionIgnore: ["enemy"], // enemies can't collide with other enemies
		}),
		k.body({ isStatic: true }),
		k.move(k.LEFT, speed),
		// if the bird is 400 from the viewport, then it collapses
		k.offscreen({ destroy: true, distance: 400 }),
		"enemy",
	]);

	makeInhalable(k, bird);

	return bird;
}
