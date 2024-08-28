import { k } from "./kaboomCtx";
import { makeMap } from "./utils";
import {
	makeBirdEnemy,
	makeFlameEnemy,
	makeGuyEnemy,
	makePlayer,
	setControls,
} from "./entities";

async function gameSetup() {
	k.loadSprite("assets", "./kirby-like.png", {
		// every sprite has a resolution of 16by16, we have 9 different sprites on the x axis
		sliceX: 9,
		// we have 10 on the y axis
		sliceY: 10,
		anims: {
			kirbIdle: 0, // at frame 0, we have the first sprite (sprite[0])
			kirbInhaling: 1, // at frame 1, we have the second sprite (sprite[1])
			kirbFull: 2, // at frame 2, we have the third sprite (sprite[2])
			// For an animation that uses more than a single frame, we use an object
			// Start the animation from frame 3 to 8 at the speed of 15 frames per second
			// sprite[3] through sprite[8] which is the dots
			// We want the animation to loop forever as long as we have the key pressed so loop:true
			kirbInhaleEffect: { from: 3, to: 8, speed: 15, loop: true },
			shootingStar: 9,
			flame: { from: 36, to: 37, speed: 4, loop: true },
			guyIdle: 18,
			guyWalk: { from: 18, to: 19, speed: 4, loop: true },
			bird: { from: 27, to: 28, speed: 4, loop: true },
		},
	});

	k.loadSprite("level-1", "./level-1.png");

	const { map: level1Layout, spawnPoints: level1SpawnPoints } = await makeMap(
		k,
		"level-1",
	);

	k.scene("level-1", () => {
		k.setGravity(2100);
		k.add([
			k.rect(k.width(), k.height()),
			k.color(k.Color.fromHex("#f7d7db")),
			k.fixed(),
		]);
		k.add(level1Layout);

		const kirb = makePlayer(
			k,
			level1SpawnPoints.player[0].x,
			level1SpawnPoints.player[0].y,
		);

		setControls(k, kirb);
		k.add(kirb);
		k.camScale(k.vec2(0.7));
		k.onUpdate(() => {
			// adjust the camera
			if (kirb.pos.x < level1Layout.pos.x + 432) k.camPos(kirb.pos.x + 500, 870);
		});

		for (const flame of level1SpawnPoints.flame) {
			makeFlameEnemy(k, flame.x, flame.y);
		}

		for (const guy of level1SpawnPoints.guy) {
			makeGuyEnemy(k, guy.x, guy.y);
		}

		for (const bird of level1SpawnPoints.bird) {
			const possibleSpeeds = [100, 200, 300];
			k.loop(10, () => {
				// loops every 10 seconds
				makeBirdEnemy(
					k,
					bird.x,
					bird.y,
					possibleSpeeds[Math.floor(Math.random() * possibleSpeeds.length)],
				);
			});
		}
	});

	k.go("level-1"); // default scene
}

gameSetup();
