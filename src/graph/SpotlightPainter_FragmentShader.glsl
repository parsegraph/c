#ifdef GL_ES
precision mediump float;
#endif

varying highp vec4 contentColor;
varying highp vec2 texCoord;

void main() {
  highp vec2 st = texCoord;
  st = st * 2.0 - 1.0;

  highp float d = min(1.0, length(abs(st)));
  d = 1.0 - pow(d, 0.2);
  gl_FragColor = vec4(contentColor.rgb, contentColor.a * d);
}
