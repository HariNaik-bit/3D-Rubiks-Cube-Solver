package com.rubikssolver.controller;

import com.rubikssolver.dto.SolveRequest;
import com.rubikssolver.dto.SolveResponse;
import com.rubikssolver.model.Cube;
import com.rubikssolver.service.CubeSolverService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cube")
public class CubeController {
    private final CubeSolverService solver;

    public CubeController(CubeSolverService solver) {
        this.solver = solver;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "up");
    }

    @PostMapping(path = "/solve", consumes = MediaType.APPLICATION_JSON_VALUE)
    public SolveResponse solve(@RequestBody SolveRequest request) {
        return new SolveResponse(solver.solve(new Cube(request.facelets())));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail invalidCube(IllegalArgumentException error) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, error.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail invalidJson() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Send a JSON object with a facelets string.");
    }

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail searchLimit(IllegalStateException error) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, error.getMessage());
    }
}
