/* Code-only rig, rendered around the visible artwork instead of a full hero-sized buffer. */
(() => {
  'use strict';
    const leftArm = [[746,326],[771,340],[755,375],[737,397],[715,414],[697,429],[693,454],[677,480],[643,501],[616,487],[597,464],[580,441],[572,409],[580,380],[572,353],[578,321],[607,300],[628,309],[653,278],[675,283],[664,316],[684,332],[695,352],[714,361],[728,344]];
  const rightArm = [[904,329],[929,342],[938,366],[950,380],[972,389],[987,370],[1009,345],[1049,296],[1068,298],[1061,329],[1084,335],[1095,358],[1091,386],[1095,420],[1087,445],[1091,477],[1077,507],[1042,522],[1015,509],[991,506],[978,482],[962,454],[948,433],[929,422],[914,402],[904,375]];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function smooth(a, b, value) { const t = clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function regionWeight(x, y, polygon, feather = 14) {
    let inside = false, minDistance = Infinity;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) inside = !inside;
      const vx = b[0] - a[0], vy = b[1] - a[1];
      const t = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy || 1), 0, 1);
      minDistance = Math.min(minDistance, Math.hypot(x - a[0] - t * vx, y - a[1] - t * vy));
    }
    return smooth(-feather, feather, inside ? minDistance : -minDistance);
  }


    const vertexSource = `
    precision highp float;
    attribute vec2 a_position;
    attribute vec4 a_rig;
    uniform vec2 u_view;
    uniform vec2 u_center;
    uniform mediump float u_time;
    uniform mediump float u_cape;
    uniform float u_hands;
    uniform float u_float;
    varying mediump vec2 v_uv;
    varying mediump float v_energy;
    varying mediump float v_cloth;
    varying mediump float v_shade;
    vec2 turn(vec2 p, vec2 pivot, float angle) {
      float s = sin(angle), c = cos(angle);
      vec2 d = p - pivot;
      return pivot + vec2(c*d.x - s*d.y, s*d.x + c*d.y);
    }
    void main() {
      vec2 p = a_position;
      float t = u_time;
      // Slow, slightly offset shoulder rotations and additional elbow flexion.
      float leftAngle = sin(t*.94) * .082 * u_hands;
      float leftFlex = sin(t*.94+.45) * .055 * u_hands;
      float rightAngle = -sin(t*.94+.7) * .076 * u_hands;
      float rightFlex = -sin(t*.94+1.1) * .050 * u_hands;
      vec2 left = turn(p, vec2(751.,340.), leftAngle);
      vec2 leftElbow = turn(vec2(716.,380.), vec2(751.,340.), leftAngle);
      left = turn(left, leftElbow, leftFlex * (1.-smoothstep(680.,738.,p.x)));
      vec2 right = turn(p, vec2(915.,342.), rightAngle);
      vec2 rightElbow = turn(vec2(952.,397.), vec2(915.,342.), rightAngle);
      right = turn(right, rightElbow, rightFlex * smoothstep(950.,1015.,p.x));
      p += (left-a_position)*a_rig.y + (right-a_position)*a_rig.z;

      // Two low-frequency cloth waves; the central body and shoulder roots stay fixed.
      float side = a_position.x < 835. ? -1. : 1.;
      float phase = t*1.55 - (a_position.y-370.)*.012 + abs(a_position.x-835.)*.007 + side*.55;
      float wave = sin(phase)*20. + sin(t*2.10-a_position.y*.020+side)*6.;
      p.x += side*wave*a_rig.x*u_cape;
      p.y += (sin(phase+.8)*10. + sin(t*1.05+a_position.x*.015)*3.)*a_rig.x*u_cape;
      p.x += (a_position.x-835.) * sin(t*1.15) * .0032 * a_rig.w * u_float;
      p.y -= sin(t*1.15) * 1.1 * a_rig.w * u_float;
      p.y += sin(t*.88) * 6.5 * u_float;
      p.x += sin(t*.44) * 1.3 * u_float;

      vec2 normalized = (p-u_center) / (u_view*.5);
      gl_Position = vec4(normalized.x, -normalized.y, 0., 1.);
      v_uv = a_position / vec2(1672.,941.);
      v_energy = max(a_rig.y,a_rig.z);
      v_cloth = a_rig.x;
      v_shade = sin(phase+.6);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform sampler2D u_image;
    uniform mediump float u_time;
    uniform float u_glow;
    uniform mediump float u_cape;
    varying mediump vec2 v_uv;
    varying mediump float v_energy;
    varying mediump float v_cloth;
    varying mediump float v_shade;
    void main() {
      vec4 pixel = texture2D(u_image,v_uv);
      pixel.a = clamp((pixel.a - .14) / .86, 0., 1.);
      float green = smoothstep(.055,.19,pixel.g-pixel.r) * smoothstep(.06,.24,pixel.g-pixel.b);
      float pulse = .06 + .09*sin(u_time*1.75+.5);
      pixel.rgb *= 1. + pulse * green * v_energy * u_glow;
      pixel.rgb *= 1. + v_shade*.027 * v_cloth * u_cape;
      gl_FragColor = pixel;
    }
  `;



  window.createHeroCharacter = function(canvas, options = {}) {
    const image = new Image();
    const stage=canvas.parentElement;
    // The alpha silhouette is x494..1182, y184..799; padding retains the moving cape and glow.
    const crop={x:460,y:145,width:760,height:700};
    let gl, program, uniforms, texture, vertexBuffer, indexBuffer, indexCount;
    let ready = false, disposed = false, raf = 0, last = null, time = 0, visible = true;
    let playing = options.playing !== false;
    const params = {cape:.55,hands:.4,float:1,glow:1,...options.params};
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    function setup() {
      gl = canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true});
      if (!gl) throw new Error('WebGL is unavailable');
      program = gl.createProgram();
      const vs=compile(gl.VERTEX_SHADER,vertexSource), fs=compile(gl.FRAGMENT_SHADER,fragmentSource);
      gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      uniforms = {};
      for (const name of ['view','center','time','cape','hands','float','glow','image']) uniforms[name] = gl.getUniformLocation(program,'u_'+name);

      // Preserve the original ~8 source-pixel mesh spacing inside the cropped region.
      const cols=96, rows=88, vertices=new Float32Array((cols+1)*(rows+1)*6);
      let offset=0;
      for (let row=0;row<=rows;row++) for (let col=0;col<=cols;col++) {
        const x=crop.x+col/cols*crop.width, y=crop.y+row/rows*crop.height;
        const left=regionWeight(x,y,leftArm)*smooth(9,37,Math.hypot(x-751,y-340));
        const right=regionWeight(x,y,rightArm)*smooth(9,37,Math.hypot(x-915,y-342));
        const cloth=smooth(365,732,y)*smooth(64,155,Math.abs(x-835))*(1-Math.max(left,right));
        const chest=1-smooth(.4,1.2,Math.hypot((x-835)/76,(y-352)/95));
        vertices[offset++]=x;vertices[offset++]=y;vertices[offset++]=cloth;
        vertices[offset++]=left;vertices[offset++]=right;vertices[offset++]=chest;
      }
      const indices=new Uint16Array(cols*rows*6); offset=0;
      for (let row=0;row<rows;row++) for (let col=0;col<cols;col++) {
        const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;
        indices[offset++]=a;indices[offset++]=c;indices[offset++]=b;
        indices[offset++]=b;indices[offset++]=c;indices[offset++]=d;
      }
      indexCount=indices.length;
      vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'a_position'),rig=gl.getAttribLocation(program,'a_rig');
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(rig);gl.vertexAttribPointer(rig,4,gl.FLOAT,false,24,8);
      indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
      texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.uniform1i(uniforms.image,0);gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      ready=true;canvas.dataset.ready='true';resize();options.onReady?.();schedule();
    }
    function render() {
      if (!ready || disposed || gl.isContextLost()) return;
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.view,crop.width,crop.height);
      gl.uniform2f(uniforms.center,crop.x+crop.width/2,crop.y+crop.height/2);
      gl.uniform1f(uniforms.time,time);
      for (const name of ['cape','hands','float','glow']) gl.uniform1f(uniforms[name],params[name]);
      gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
    }
    function resize() {
      if (!ready) return;
      const width=stage.clientWidth,height=stage.clientHeight;
      if(!width||!height)return;
      const sourceHeight=Math.max(941,1672/(width/height)),scale=height/sourceHeight;
      const displayScale=stage.getBoundingClientRect().width/width;
      const dpr=Math.min(devicePixelRatio||1,1.75)*displayScale;
      canvas.style.left=(width/2+(crop.x-836)*scale)+'px';
      canvas.style.top=(height/2+(crop.y-470.5)*scale)+'px';
      canvas.style.width=(crop.width*scale)+'px';canvas.style.height=(crop.height*scale)+'px';
      const bufferWidth=Math.max(1,Math.round(crop.width*scale*dpr));
      const bufferHeight=Math.max(1,Math.round(crop.height*scale*dpr));
      if(canvas.width!==bufferWidth)canvas.width=bufferWidth;
      if(canvas.height!==bufferHeight)canvas.height=bufferHeight;
      render();
    }
    function stop() {cancelAnimationFrame(raf);raf=0;last=null;}
    function schedule() {if (ready && playing && visible && !document.hidden && !disposed && !raf) raf=requestAnimationFrame(tick);}
    function tick(now) {
      raf=0;
      if (!playing || !visible || document.hidden || disposed) {last=null;return;}
      if (last!==null) time+=Math.min((now-last)/1000,.05);
      last=now;render();schedule();
    }
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
    const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;stop();schedule();});visibilityObserver.observe(canvas);
    const visibility=()=>{stop();schedule();};document.addEventListener('visibilitychange',visibility);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;stop();options.onError?.(new Error('Graphics context interrupted'));});
    image.onload=()=>{try{setup();}catch(error){stop();ready=false;options.onError?.(error);}};
    image.onerror=()=>options.onError?.(new Error('Artwork could not be loaded'));
    image.src=options.src||'assets/original.png';
    return {
      setPlaying(value) {const next=Boolean(value);if(next===playing)return;playing=next;stop();render();schedule();},
      still() {time=0;for(const key of ['cape','hands','float','glow'])params[key]=0;playing=false;stop();render();},
      destroy() {
        disposed=true;stop();resizeObserver.disconnect();visibilityObserver.disconnect();document.removeEventListener('visibilitychange',visibility);
        if(gl&&!gl.isContextLost()){gl.deleteTexture(texture);gl.deleteBuffer(vertexBuffer);gl.deleteBuffer(indexBuffer);gl.deleteProgram(program);}
      }
    };
  };
})();
