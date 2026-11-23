package com.rubikssolver.service;

import com.rubikssolver.model.Cube;
import cs.min2phase.Search;
import java.util.List;
import java.util.concurrent.Semaphore;
import org.springframework.stereotype.Service;

@Service
public class CubeSolverService {
    private final Semaphore searchSlots = new Semaphore(2);

    public List<String> solve(Cube cube) {
        if (cube.isSolved()) {
            return List.of();
        }

        if (!searchSlots.tryAcquire()) {
            throw new IllegalStateException("The solver is busy. Try again shortly.");
        }
        String result;
        try {
            result = new Search().solution(cube.facelets(), 21, 1_000_000, 0, 0).trim();
        } finally {
            searchSlots.release();
        }
        if (result.startsWith("Error")) {
            throw switch (result) {
                case "Error 1" -> new IllegalArgumentException("The sticker counts are invalid.");
                case "Error 2" -> new IllegalArgumentException("The cube has missing or duplicate edges.");
                case "Error 3" -> new IllegalArgumentException("An edge is flipped.");
                case "Error 4" -> new IllegalArgumentException("The cube has missing or duplicate corners.");
                case "Error 5" -> new IllegalArgumentException("A corner is twisted.");
                case "Error 6" -> new IllegalArgumentException("The corner and edge permutations have incompatible parity.");
                default -> new IllegalStateException("The solver reached its search limit.");
            };
        }
        return List.of(result.split("\\s+"));
    }
}
