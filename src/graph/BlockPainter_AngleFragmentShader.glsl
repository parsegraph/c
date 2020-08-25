#extension GL_OES_standard_derivatives : enable

#ifdef GL_ES
precision mediump float;
#endif

// Derived from https://thebookofshaders.com/07/
varying highp vec4 contentColor;
varying highp vec4 borderColor;
varying highp float borderRoundedness;
varying highp vec2 texCoord;
// borderThickness is in [0, 1] terms.
varying highp float borderThickness;
varying highp float aspectRatio;

void main() {
    // Adjust for the aspect ratio.
    highp vec2 st = texCoord;
    st = st * 2.0 - 1.0;
    st.x = abs(st.x);
    st.y = abs(st.y);"

    // 1.0 if st is inside the X-axis border.
    highp float t = borderThickness;
    highp float insideYContent = 1.0 - step(1.0 - t, st.y);
    highp float insideXBorder = step(1.0 - t, st.x);

    // y = y1 + m(x - x1)
    highp float insideBorderAngle = 1.0 - step((st.x - 1.0)/-t, st.y);
    highp float insideContentAngle = 1.0 - step((st.x - 1.0)/-t - aspectRatio, st.y);

    highp float inBorder = step(1.0, insideBorderAngle);
    highp float inContent = step(1.0, insideContentAngle * insideYContent);

    // Map the two calculated indicators to their colors.
    gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);
    gl_FragColor = mix(gl_FragColor, contentColor, inBorder * inContent);
}
