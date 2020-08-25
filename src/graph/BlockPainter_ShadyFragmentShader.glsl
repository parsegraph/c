#ifdef GL_ES
precision mediump float;
#endif

varying highp vec4 contentColor;
varying highp vec4 borderColor;
varying highp float borderRoundedness;
varying highp vec2 texCoord;
varying highp float borderThickness;
varying highp float aspectRatio;

// Plot a line on Y using a value between 0.0-1.0
float plot(vec2 st, float pct)
  return smoothstep(pct-0.02, pct, st.y) - smoothstep(pct, pct+0.02, st.y);
}

void main() {
    highp vec2 st = texCoord;
    st = st * 2.0 - 1.0;

    // Adjust for the aspect ratio.
    st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));
    st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));

    gl_FragColor = vec4(vec3(0.5 - (0.3 * st.y)), 1.0);
}
