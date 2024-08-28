import kaboom from "kaboom";
import { scale } from "./constants";

export const k = kaboom({
	// fits a 16:9 ratio
	width: 256 * scale,
	height: 144 * scale,
	scale,
	letterbox: true,
	global: false, // only want to use kaboom when we are using the constant
});
