import { scale } from "./constants";
import { KaboomCtx } from "kaboom";

export async function makeMap(k: KaboomCtx, name: string) {
	const mapData = await (await fetch(`./${name}.json`)).json();

	const map = k.make([k.sprite(name), k.scale(scale), k.pos(0)]); // make() creates game object but doesn't display it and k.pos(0) means our map starts at (0,0)

	const spawnPoints: { [key: string]: { x: number; y: number }[] } = {};

	for (const layer of mapData.layers) {
		if (layer.name === "colliders") {
			for (const collider of layer.objects) {
				map.add([
					k.area({
						shape: new k.Rect(k.vec2(0), collider.width, collider.height),
						collisionIgnore: ["platform", "exit"],
					}),
					collider.name !== "exit" ? k.body({ isStatic: true }) : null, // Once the player collides with them, the platforms won't move
					k.pos(collider.x, collider.y),
					collider.name !== "exit" ? "platform" : "exit", // if true, give platform tag
				]); //area() is the hit-box
			}
			continue;
		}
		if (layer.name === "spawnpoints") {
			for (const spawnPoint of layer.objects) {
				if (spawnPoints[spawnPoint.name]) {
					spawnPoints[spawnPoint.name].push({
						x: spawnPoint.x,
						y: spawnPoint.y,
					});
					continue;
				}
				spawnPoints[spawnPoint.name] = [{ x: spawnPoint.x, y: spawnPoint.y }];
			}
		}
	}
	return { map, spawnPoints };
}
