package com.rubikssolver.model;

public record Cube(String facelets) {
    public static final String SOLVED = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    private static final String FACES = "URFDLB";

    public Cube {
        if (facelets == null || !facelets.matches("[URFDLB]{54}")) {
            throw new IllegalArgumentException("Send 54 facelets using U, R, F, D, L and B.");
        }
        for (int face = 0; face < FACES.length(); face++) {
            char label = FACES.charAt(face);
            if (facelets.charAt(face * 9 + 4) != label ||
                    facelets.chars().filter(sticker -> sticker == label).count() != 9) {
                throw new IllegalArgumentException("Each face label must occur nine times with fixed URFDLB centers.");
            }
        }
    }

    public boolean isSolved() {
        return SOLVED.equals(facelets);
    }
}
