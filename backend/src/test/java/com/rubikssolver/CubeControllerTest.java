package com.rubikssolver;

import com.rubikssolver.model.Cube;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "CUBE_ALLOWED_ORIGINS=https://cube.example.com, https://preview.example.com")
@AutoConfigureMockMvc
class CubeControllerTest {
    private static final String ALLOWED_ORIGIN = "https://cube.example.com";
    @Autowired
    private MockMvc mvc;

    @Test
    void returnsEmptySolutionForSolvedCube() throws Exception {
        solve(Cube.SOLVED).andExpect(status().isOk()).andExpect(content().json("{\"moves\":[]}"));
    }

    @Test
    void solvesSingleFaceTurnFromStickers() throws Exception {
        solve("UUFUUFUUFRRRRRRRRRFFDFFDFFDDDBDDBDDBLLLLLLLLLUBBUBBUBB")
                .andExpect(status().isOk())
                .andExpect(content().json("{\"moves\":[\"R'\"]}"));
    }

    @Test
    void rejectsMalformedFacelets() throws Exception {
        solve("URFDLB").andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void rejectsAnOtherwiseWellFormedFlippedEdge() throws Exception {
        char[] stickers = Cube.SOLVED.toCharArray();
        stickers[7] = 'F';
        stickers[19] = 'U';
        solve(new String(stickers))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("An edge is flipped."));
    }

    @Test
    void rejectsMissingFaceletsAndBrokenJson() throws Exception {
        postJson("{}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").exists());
        postJson("{").andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void rejectsNonJsonRequestBodies() throws Exception {
        mvc.perform(post("/api/cube/solve").contentType(MediaType.TEXT_PLAIN).content(Cube.SOLVED))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void reportsHealthWithoutInternalDetails() throws Exception {
        mvc.perform(get("/api/cube/health"))
                .andExpect(status().isOk()).andExpect(content().json("{\"status\":\"up\"}", JsonCompareMode.STRICT));
    }

    @Test
    void allowsPreflightAndSolveFromAnApprovedOriginWithoutCredentials() throws Exception {
        mvc.perform(options("/api/cube/solve")
                        .header(HttpHeaders.ORIGIN, ALLOWED_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ALLOWED_ORIGIN))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS));
        mvc.perform(post("/api/cube/solve").header(HttpHeaders.ORIGIN, "https://preview.example.com")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"facelets\":\"" + Cube.SOLVED + "\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://preview.example.com"));
    }

    @Test
    void rejectsPreflightFromAnUnapprovedOrigin() throws Exception {
        mvc.perform(options("/api/cube/solve")
                        .header(HttpHeaders.ORIGIN, "https://cube.example.com.other.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    private ResultActions solve(String facelets) throws Exception {
        return postJson("{\"facelets\":\"" + facelets + "\"}");
    }

    private ResultActions postJson(String json) throws Exception {
        return mvc.perform(post("/api/cube/solve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }
}
