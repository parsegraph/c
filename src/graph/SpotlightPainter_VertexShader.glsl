uniform mat3 u_world;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_color;

varying highp vec2 texCoord;
varying highp vec4 contentColor;

void main() {
  contentColor = a_color;
  gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);
  texCoord = a_texCoord;
}
