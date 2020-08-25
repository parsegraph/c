uniform mat3 u_world;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_color;
attribute vec4 a_borderColor;
attribute highp float a_borderRoundedness;
attribute highp float a_borderThickness;
attribute highp float a_aspectRatio;

varying highp vec2 texCoord;
varying highp float borderThickness;
varying highp float borderRoundedness;
varying highp vec4 borderColor;
varying highp vec4 contentColor;
varying highp float aspectRatio;

void main() {
    gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);
    contentColor = a_color;
    borderColor = a_borderColor;
    borderRoundedness = max(0.001, a_borderRoundedness);
    texCoord = a_texCoord;
    borderThickness = a_borderThickness;
    aspectRatio = a_aspectRatio;
}
