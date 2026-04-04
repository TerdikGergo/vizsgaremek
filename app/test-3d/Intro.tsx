"use client";

import React from "react";

export default function Intro({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="registration-root">
      <div className="registration-card intro-card">
        <h1 className="registration-title">Project Intro</h1>

        <p className="intro-text">
          This project is a 3D car configuration experience built around interactive vehicle and engine visualization.
          You can start on the Home page, open Customize to pick your car model and adjust options, then move to the
          Engine flow to explore Diesel/Gasoline and Hybrid setups.
        </p>

        <p className="intro-text">
          In Diesel/Gasoline and Hybrid pages, you can inspect the loaded models in 3D, change materials, run calculations,
          and review chart outputs like RPM, power, speed, temperature, and durability over time. The project is designed so
          users can compare configurations quickly and understand performance differences visually.
        </p>

        <p className="intro-text">
          You can also store your chosen builds in the Garage page and revisit saved models later. The current version focuses
          on frontend interaction and visualization, and backend connection can be added afterward.
        </p>

        <button className="registration-button" type="button" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
