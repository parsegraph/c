uniform mat3 u_world;

attribute vec2 a_position;
attribute vec4 a_color;

varying highp vec4 contentColor;

void main() {
    gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);
    contentColor = a_color;
}
