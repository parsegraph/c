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

    // Calculate the distance function.
    highp float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));

    // Default antialias implementation.
    highp float borderTolerance = 0.0;
    highp float inBorder = 1.0 - smoothstep(
        borderRoundedness - borderTolerance,
        borderRoundedness + borderTolerance,
        d
    );
    highp float edgeWidth = 0.0
    highp float inContent = 1.0 - smoothstep(
        (borderRoundedness - borderThickness) - edgeWidth,
        (borderRoundedness - borderThickness) + edgeWidth,
        d
    );

    // Map the two calculated indicators to their colors.
    gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);
    gl_FragColor = mix(gl_FragColor, contentColor, inContent);
}
