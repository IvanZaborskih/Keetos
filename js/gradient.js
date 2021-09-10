const shader = {
	vertex: `attribute vec4 a_position;
	uniform mat4 u_modelViewMatrix;
	uniform mat4 u_projectionMatrix;
	void main() {
    gl_Position = a_position;
	}`,
	fragment: `precision highp float;
	uniform vec2 u_resolution;
	uniform vec2 u_mouse;
	uniform float u_time;
	uniform sampler2D u_noise;
	uniform sampler2D u_buffer;
	uniform bool u_bufferpass;
	#define PI 3.141592653589793
	#define TAU 6.283185307179586
	vec2 getScreenSpace() {
    vec2 uv = (gl_FragCoord.xy) / min(u_resolution.y, u_resolution.x);
    return uv;
	}
	#define pow2(x) (x * x)
	const int samples = 2;
	const float sigma = float(samples) * 0.25;
	float gaussian(vec2 i) {
	return 1.0 / (2.0 * PI * pow2(sigma)) * exp(-((pow2(i.x) + pow2(i.y)) / (2.0 * pow2(sigma))));
	}
	vec3 blur(sampler2D sp, vec2 uv, vec2 scale) {
	vec3 col = vec3(0.0);
	float accum = 0.0;
	float weight;
	vec2 offset;
	for (int x = -samples / 2; x < samples / 2; ++x) {
	for (int y = -samples / 2; y < samples / 2; ++y) {
	offset = vec2(x, y);
	weight = gaussian(offset);
	col += texture2D(sp, uv + scale * offset).rgb * weight;
	accum += weight;
	}
	}
	return col / accum;
	}
	const float blurStrength = 2.;
  const float blurMultiplier = 0.998;
  // Цвета
  void main() {
    vec2 uv = getScreenSpace();
    vec2 sample = gl_FragCoord.xy / u_resolution;
    vec3 colour = vec3(sin(uv.x)*.5+.1, sin(uv.y)*.5+.5, 1);
    float s = texture2D(u_buffer, sample).r;
    vec2 ps = vec2(3.0) / u_resolution.xy;
    if(u_bufferpass) {
  s = (blur(u_buffer, sample + vec2(.003), ps*blurStrength) * blurMultiplier).r;
  float c = s * .97 + smoothstep(length(ps)*20., .0, length(uv - u_mouse)*.6) * .2;
  colour = vec3(c);
    } else {
  colour = mix(vec3(0.305), colour, sin(s)*.5+.45);
  colour *= colour*3.;
    }
    gl_FragColor = vec4(colour,1.0);
    }`
};
class WTCGL {
	constructor(el, vertexShaderSource, fragmentShaderSource, width, height, pxratio, styleElement, webgl2) {
		this.run = this.run.bind(this);
		this._onRun = () => { };
		if (el instanceof Object && el.el) {
			({ el, vertexShaderSource, fragmentShaderSource, width, height, pxratio, webgl2, styleElement } = el);
		}
		if (!el instanceof HTMLElement || el.nodeName.toLowerCase() !== 'canvas') {
			console.log('Provided element should be a canvas element');
			return null;
		}
		this._el = el;
		if (webgl2 === true) {
			this._ctx = this._el.getContext("webgl2", this.webgl_params) || this._el.getContext("webgl", this.webgl_params) || this._el.getContext("experimental-webgl", this.webgl_params);
		} else {
			this._ctx = this._el.getContext("webgl", this.webgl_params) || this._el.getContext("experimental-webgl", this.webgl_params);
		}
		this._ctx.getExtension('OES_standard_derivatives');
		this._ctx.getExtension('EXT_shader_texture_lod');
		this._ctx.getExtension('OES_texture_float');
		this._ctx.getExtension('WEBGL_color_buffer_float');
		this._ctx.getExtension('OES_texture_float_linear');
		if (!this._ctx) {
			console.log('Browser doesn\'t support WebGL ');
			return null;
		}
		this._vertexShader = WTCGL.createShaderOfType(this._ctx, this._ctx.VERTEX_SHADER, vertexShaderSource);
		this._fragmentShader = WTCGL.createShaderOfType(this._ctx, this._ctx.FRAGMENT_SHADER, fragmentShaderSource);
		this._program = this._ctx.createProgram();
		this._ctx.attachShader(this._program, this._vertexShader);
		this._ctx.attachShader(this._program, this._fragmentShader);
		this._ctx.linkProgram(this._program);
		if (!this._ctx.getProgramParameter(this._program, this._ctx.LINK_STATUS)) {
			console.log('Unable to initialize the shader program: ' + this._ctx.getProgramInfoLog(this._program));
			return null;
		}
		this.initBuffers([
			-1.0, 1.0, -1.,
			1.0, 1.0, -1.,
			-1.0, -1.0, -1.,
			1.0, -1.0, -1.,
		]);
		this.frameBuffers = [];
		this._programInfo = {
			attribs: {
				vertexPosition: this._ctx.getAttribLocation(this._program, 'a_position'),
			},
			uniforms: {
				projectionMatrix: this._ctx.getUniformLocation(this._program, 'u_projectionMatrix'),
				modelViewMatrix: this._ctx.getUniformLocation(this._program, 'u_modelViewMatrix'),
				resolution: this._ctx.getUniformLocation(this._program, 'u_resolution'),
				time: this._ctx.getUniformLocation(this._program, 'u_time'),
			},
		};
		this._ctx.useProgram(this._program);
		this.pxratio = pxratio;
		this.styleElement = styleElement !== true;
		this.resize(width, height);
	}
	addFrameBuffer(w, h, tiling = 0, buffertype = 0) {
		const gl = this._ctx;
		const targetTextureWidth = w * this.pxratio;
		const targetTextureHeight = h * this.pxratio;
		const targetTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, targetTexture);
		{
			const level = 0;
			const internalFormat = gl.RGBA;
			const border = 0;
			const format = gl.RGBA;
			const type = buffertype === WTCGL.TEXTYPE_FLOAT ? gl.FLOAT : gl.UNSIGNED_BYTE;
			const data = null;
			gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
				targetTextureWidth, targetTextureHeight, border, format, type, data);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			if (tiling === WTCGL.IMAGETYPE_TILE) {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			} else if (tiling === WTCGL.IMAGETYPE_MIRROR) {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
			} else if (tiling === WTCGL.IMAGETYPE_REGULAR) {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			}
		}
		const fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		const attachmentPoint = gl.COLOR_ATTACHMENT0;
		const level = 0;
		gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
		return {
			w: w * this.pxratio,
			h: h * this.pxratio,
			fb: fb,
			frameTexture: targetTexture
		};
	}
	resize(w, h) {
		this._el.width = w * this.pxratio;
		this._el.height = h * this.pxratio;
		this._size = [w * this.pxratio, h * this.pxratio];
		if (this.styleElement) {
			this._el.style.width = w + 'px';
			this._el.style.height = h + 'px';
		}
		this._ctx.viewportWidth = w * this.pxratio;
		this._ctx.viewportHeight = h * this.pxratio;
		this._ctx.uniform2fv(this._programInfo.uniforms.resolution, this._size);
		this.initBuffers(this._positions);
	}
	initBuffers(positions) {
		this._positions = positions;
		this._positionBuffer = this._ctx.createBuffer();
		this._ctx.bindBuffer(this._ctx.ARRAY_BUFFER, this._positionBuffer);
		this._ctx.bufferData(this._ctx.ARRAY_BUFFER,
			new Float32Array(positions),
			this._ctx.STATIC_DRAW);
	}
	addUniform(name, type, value) {
		let uniform = this._programInfo.uniforms[name];
		uniform = this._ctx.getUniformLocation(this._program, `u_${name}`);
		switch (type) {
			case WTCGL.TYPE_INT:
				if (!isNaN(value)) this._ctx.uniform1i(uniform, value);
				break;
			case WTCGL.TYPE_FLOAT:
				if (!isNaN(value)) this._ctx.uniform1f(uniform, value);
				break;
			case WTCGL.TYPE_V2:
				if (value instanceof Array && value.length === 2.) this._ctx.uniform2fv(uniform, value);
				break;
			case WTCGL.TYPE_V3:
				if (value instanceof Array && value.length === 3.) this._ctx.uniform3fv(uniform, value);
				break;
			case WTCGL.TYPE_V4:
				if (value instanceof Array && value.length === 4.) this._ctx.uniform4fv(uniform, value);
				break;
			case WTCGL.TYPE_BOOL:
				if (!isNaN(value)) this._ctx.uniform1i(uniform, value);
				break;
		}
		this._programInfo.uniforms[name] = uniform;
		return uniform;
	}
	addTexture(name, type, image, liveUpdate = false) {
		var texture = this._ctx.createTexture();
		this._ctx.pixelStorei(this._ctx.UNPACK_FLIP_Y_WEBGL, true);
		this._ctx.bindTexture(this._ctx.TEXTURE_2D, texture);
		if (type === WTCGL.IMAGETYPE_MIRROR) {
			this._ctx.texParameteri(this._ctx.TEXTURE_2D, this._ctx.TEXTURE_WRAP_S, this._ctx.MIRRORED_REPEAT);
			this._ctx.texParameteri(this._ctx.TEXTURE_2D, this._ctx.TEXTURE_WRAP_T, this._ctx.MIRRORED_REPEAT);
		} else if (type === WTCGL.IMAGETYPE_REGULAR) {
			this._ctx.texParameteri(this._ctx.TEXTURE_2D, this._ctx.TEXTURE_WRAP_S, this._ctx.CLAMP_TO_EDGE);
			this._ctx.texParameteri(this._ctx.TEXTURE_2D, this._ctx.TEXTURE_WRAP_T, this._ctx.CLAMP_TO_EDGE);
		}
		this._ctx.texParameteri(this._ctx.TEXTURE_2D, this._ctx.TEXTURE_MIN_FILTER, this._ctx.LINEAR);
		this._ctx.texImage2D(this._ctx.TEXTURE_2D, 0, this._ctx.RGBA, this._ctx.RGBA, this._ctx.UNSIGNED_BYTE, image);
		this.pushTexture(name, texture, image, this._ctx.TEXTURE_2D, liveUpdate);
		return texture;
	}
	pushTexture(name, texture, image, target, liveUpdate = false) {
		let textures = this.textures;
		textures.push({ name: name, tex: texture, liveUpdate: liveUpdate, image: image, target: target });
		this.textures = textures;
	}
	updateTexture(texture, image) {
		this._ctx.bindTexture(this._ctx.TEXTURE_2D, texture);
		this._ctx.texImage2D(this._ctx.TEXTURE_2D, 0, this._ctx.RGBA, this._ctx.RGBA, this._ctx.UNSIGNED_BYTE, image);
	}
	initTextures() {
		for (let i = 0; i < this.textures.length; i++) {
			let name = this.textures[i].name;
			let uniform = this._programInfo.uniforms[name];
			uniform = this._ctx.getUniformLocation(this._program, `u_${name}`);
			this._ctx.uniform1i(uniform, i);
			this._ctx.activeTexture(this._ctx[`TEXTURE${i}`]);
			this._ctx.bindTexture(this.textures[i].target, this.textures[i].tex);
		}
	}
	run(delta) {
		this.running && requestAnimationFrame(this.run);
		this.time = this.startTime + delta * .0002;
		this.onRun(delta);
		this.render();
	}
	render(buffer = {}) {
		this._ctx.bindFramebuffer(this._ctx.FRAMEBUFFER, buffer.fb || null);
		this._ctx.uniform1f(this._programInfo.uniforms.time, this.time);
		this.textures.forEach((textureInfo) => {
			if (textureInfo.liveUpdate === true) {
				this.updateTexture(textureInfo.tex, textureInfo.image);
			}
		});
		this._ctx.viewport(0, 0, buffer.w || this._ctx.viewportWidth, buffer.h || this._ctx.viewportHeight);
		if (this.clearing) {
			this._ctx.clearColor(1.0, 0.0, 0.0, 0.0);
			this._ctx.blendFunc(this._ctx.SRC_ALPHA, this._ctx.ONE_MINUS_SRC_ALPHA);
			this._ctx.clear(this._ctx.COLOR_BUFFER_BIT);
		}
		this._ctx.bindBuffer(this._ctx.ARRAY_BUFFER, this._positionBuffer);
		this._ctx.vertexAttribPointer(
			this._programInfo.attribs.vertexPosition,
			3,
			this._ctx.FLOAT,
			false,
			0,
			0);
		this._ctx.enableVertexAttribArray(this._programInfo.attribs.vertexPosition);
		this.includePerspectiveMatrix && this._ctx.uniformMatrix4fv(this._programInfo.uniforms.projectionMatrix, false, this.perspectiveMatrix);
		this.includeModelViewMatrix && this._ctx.uniformMatrix4fv(this._programInfo.uniforms.modelViewMatrix, false, this.modelViewMatrix);

		this._ctx.drawArrays(this._ctx.TRIANGLE_STRIP, 0, 4);
	}
	get webgl_params() {
		return { alpha: true };
	}
	set styleElement(value) {
		this._styleElement = value === true;
		if (this._styleElement === false && this._el) {
			this._el.style.width = '';
			this._el.style.height = '';
		}
	}
	get styleElement() {
		return this._styleElement !== false;
	}
	set startTime(value) {
		if (!isNaN(value)) {
			this._startTime = value;
		}
	}
	get startTime() {
		return this._startTime || 0;
	}
	set time(value) {
		if (!isNaN(value)) {
			this._time = value;
		}
	}
	get time() {
		return this._time || 0;
	}
	set includePerspectiveMatrix(value) {
		this._includePerspectiveMatrix = value === true;
	}
	get includePerspectiveMatrix() {
		return this._includePerspectiveMatrix === true;
	}
	set includeModelViewMatrix(value) {
		this._includeModelViewMatrix = value === true;
	}
	get includeModelViewMatrix() {
		return this._includeModelViewMatrix === true;
	}
	set textures(value) {
		if (value instanceof Array) {
			this._textures = value;
		}
	}
	get textures() {
		return this._textures || [];
	}
	set clearing(value) {
		this._clearing = value === true;
	}
	get clearing() {
		return this._clearing === true;
	}
	set running(value) {
		!this.running && value === true && requestAnimationFrame(this.run);
		this._running = value === true;
	}
	get running() {
		return this._running === true;
	}
	set pxratio(value) {
		if (value > 0) this._pxratio = value;
	}
	get pxratio() {
		return this._pxratio || 1;
	}
	get perspectiveMatrix() {
		const fieldOfView = 45 * Math.PI / 180;   // in radians
		const aspect = this._size.w / this._size.h;
		const zNear = 0.1;
		const zFar = 100.0;
		const projectionMatrix = mat4.create();
		mat4.perspective(projectionMatrix,
			fieldOfView,
			aspect,
			zNear,
			zFar);

		return projectionMatrix;
	}
	get modelViewMatrix() {
		const modelViewMatrix = mat4.create();
		mat4.translate(modelViewMatrix,     // destination matrix
			modelViewMatrix,     // matrix to translate
			[-0.0, 0.0, -1.]);  // amount to translate
		return modelViewMatrix;
	}
	set onRun(runMethod) {
		if (typeof runMethod == 'function') {
			this._onRun = runMethod.bind(this);
		}
	}
	get onRun() {
		return this._onRun;
	}
	get context() {
		return this._ctx || null;
	}
	static createShaderOfType(ctx, type, source) {
		const shader = ctx.createShader(type);
		ctx.shaderSource(shader, source);
		ctx.compileShader(shader);
		if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
			console.log('An error occurred compiling the shaders: ' + ctx.getShaderInfoLog(shader));
			ctx.deleteShader(shader);
			return null;
		}
		return shader;
	}
}
WTCGL.TYPE_INT = 0;
WTCGL.TYPE_FLOAT = 1;
WTCGL.TYPE_V2 = 2;
WTCGL.TYPE_V3 = 3;
WTCGL.TYPE_V4 = 4;
WTCGL.TYPE_BOOL = 5;
WTCGL.IMAGETYPE_REGULAR = 0;
WTCGL.IMAGETYPE_TILE = 1;
WTCGL.IMAGETYPE_MIRROR = 2;
WTCGL.TEXTYPE_FLOAT = 0;
WTCGL.TEXTYPE_UNSIGNED_BYTE = 1;
const cc = document.getElementById("webgl");
const twodWebGL = new WTCGL(
	document.querySelector('canvas#webgl'),
	shader.vertex,
	shader.fragment,
	cc.offsetWidth,
	cc.offsetHeight,
	.5
);
twodWebGL.startTime = -100 + Math.random() * 50;
twodWebGL.context.getExtension('WEBGL_color_buffer_float');
twodWebGL.context.getExtension('OES_texture_float_linear');
let fb1 = twodWebGL.addFrameBuffer(cc.offsetWidth, cc.offsetHeight, WTCGL.IMAGETYPE_REGULAR, WTCGL.TEXTYPE_UNSIGNED_BYTE);
let fb2 = twodWebGL.addFrameBuffer(cc.offsetWidth, cc.offsetHeight, WTCGL.IMAGETYPE_REGULAR, WTCGL.TEXTYPE_UNSIGNED_BYTE);
let activeFB = fb1;
window.fb1 = fb1;
window.ctx = twodWebGL._ctx;

twodWebGL.onRun = (delta) => {
	let _ctx = twodWebGL._ctx;
	uniform = _ctx.getUniformLocation(twodWebGL._program, `u_buffer`);
	_ctx.uniform1i(uniform, 5);
	_ctx.activeTexture(_ctx.TEXTURE5);
	_ctx.bindTexture(_ctx.TEXTURE_2D, activeFB.frameTexture);
	activeFB = activeFB === fb1 ? fb2 : fb1;
	twodWebGL.addUniform('bufferpass', WTCGL.TYPE_BOOL, true);
	twodWebGL.render(activeFB);
	twodWebGL.addUniform('bufferpass', WTCGL.TYPE_BOOL, false);
}
let mousepos = [0, 0];
const u_mousepos = twodWebGL.addUniform('mouse', WTCGL.TYPE_V2, mousepos);
let mousemoved = false;
window.addEventListener('pointermove', (e) => {
	let ratio = cc.offsetHeight / cc.offsetWidth;
	if (cc.offsetHeight > cc.offsetWidth) {
		mousepos[0] = (e.clientX - cc.getBoundingClientRect().left) / cc.offsetWidth;
		mousepos[1] = ((e.clientY - cc.getBoundingClientRect().top) * -1) / cc.offsetHeight * ratio + ratio;
	} else {
		mousepos[0] = (e.clientX - cc.getBoundingClientRect().left) / cc.offsetWidth / ratio;
		mousepos[1] = ((e.clientY - cc.getBoundingClientRect().top) * -1) / cc.offsetHeight + 1.;
	}
	twodWebGL.addUniform('mouse', WTCGL.TYPE_V2, mousepos);
	mousemoved = true;
});
const m = (delta) => {
	if (mousemoved === false) {
		requestAnimationFrame(m);
	}
	let ratio = cc.offsetHeight / cc.offsetWidth;
	mousepos[0] = (cc.offsetWidth * .5) / cc.offsetWidth / ratio + Math.sin(delta * .001) * .4;
	mousepos[1] = .5 + Math.sin(delta * .002) * .3;
	twodWebGL.addUniform('mouse', WTCGL.TYPE_V2, mousepos);
}
requestAnimationFrame(m);
const textures = [
	{
		name: 'noise',
		url: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/noise.png',
		type: WTCGL.IMAGETYPE_TILE,
		img: null
	}
];
const loadImage = function (imageObject) {
	let img = document.createElement('img');
	img.crossOrigin = "anonymous";

	return new Promise((resolve, reject) => {
		img.addEventListener('load', (e) => {
			imageObject.img = img;
			resolve(imageObject);
		});
		img.addEventListener('error', (e) => {
			reject(e);
		});
		img.src = imageObject.url
	});
}
const loadTextures = function (textures) {
	return new Promise((resolve, reject) => {
		const loadTexture = (pointer) => {
			if (pointer >= textures.length || pointer > 10) {
				resolve(textures);
				return;
			};
			const imageObject = textures[pointer];
			const p = loadImage(imageObject);
			p.then(
				(result) => {
					twodWebGL.addTexture(result.name, result.type, result.img);
				},
				(error) => {
					console.log('error', error)
				}).finally((e) => {
					loadTexture(pointer + 1);
				});
		}
		loadTexture(0);
	});
}
loadTextures(textures).then(
	(result) => {
		twodWebGL.initTextures();
		twodWebGL.running = true;
	},
	(error) => {
		console.log('error');
	}
);