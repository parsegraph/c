#extension GL_OES_standard_derivatives : enable

#ifdef GL_ES
precision mediump float;
#endif

// Derived from https://thebookofshaders.com/07/
varying highp vec4 contentColor;
varying highp vec4 borderColor;
varying highp float borderRoundedness;
varying highp vec2 texCoord;
varying highp float borderThickness;
varying highp float aspectRatio;

void main() {
    highp vec2 st = texCoord;
    st = st * 2.0 - 1.0;
    // Adjust for the aspect ratio.
    st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));
    st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));
    st.x = abs(st.x);
    st.y = abs(st.y);

    // 1.0 if st is inside the X-axis border.
    highp float t = borderThickness;
    highp float insideYContent = step(1.0 - t, st.y);
    highp float insideXBorder = step(1.0 - t, st.x/(1.0 - t/2.0));

    highp float inBorder = step(1.0, 1.0 - insideXBorder + 1.0 - step(1.0, length(vec2((st.x - (1.0 - t))/t, st.y/(1.0 + 2.0*t)))));
    highp float inContent = step(1.0, 1.0 - step(1.0 - t, st.x)*(1.0 - insideYContent) + 1.0 - step(1.0 - t, length(vec2((st.x/(1.0 - t) - (1.0 - t))/t, st.y/(1.0 + 3.0*t)))));

    // Map the two calculated indicators to their colors.
    gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);
    gl_FragColor = mix(gl_FragColor, contentColor, inContent);
}
