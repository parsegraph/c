#ifdef GL_ES
precision mediump float;
#endif

varying highp vec4 contentColor;

void main() {
    gl_FragColor = contentColor;
}
