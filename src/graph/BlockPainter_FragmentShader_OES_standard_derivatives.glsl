#extension GL_OES_standard_derivatives : enable

#ifdef GL_ES
precision mediump float;
#endif

varying highp vec4 contentColor;
varying highp vec4 borderColor;
varying highp float borderRoundedness;
varying highp vec2 texCoord;
varying highp float borderThickness;
varying highp float aspectRatio;

highp float aastep(float threshold, float value)
{
    highp float afwidth = 0.9 * length(vec2(dFdx(value), dFdy(value)));
    return smoothstep(threshold - afwidth, threshold + afwidth, value);
    return step(threshold, value);
}

void main() {
    highp vec2 st = texCoord;
    st = st * 2.0 - 1.0;

    // Adjust for the aspect ratio.
    st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));
    st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));

    // Calculate the distance function.
    highp float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));

    // Using 'OpenGL insights' antialias implementation
    highp float inBorder = 1.0 - aastep(borderRoundedness, d);
    highp float inContent = 1.0 - aastep(borderRoundedness - borderThickness, d);

    // Map the two calculated indicators to their colors.
    gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);
    gl_FragColor = mix(gl_FragColor, contentColor, inContent);
}
