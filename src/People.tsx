import React, { useState } from "react";

export type ReservePerson = {
  name: string;
  active?: boolean;
};

type Props = {
  people: ReservePerson[];
  toggleActive: (arg0: ReservePerson) => void;
  isDisabled: (arg0: ReservePerson) => boolean;
};

export const People = ({ people, toggleActive, isDisabled }: Props) => {
  return (
    <>
      <div>{deleteIcon}</div>
      <div>
        {people &&
          [...people]
            .sort((a, b) =>
              a.name.localeCompare(b.name, undefined, {
                sensitivity: "accent",
              })
            )
            .map((person) => {
              return (
                <div
                  style={{ cursor: "default" }}
                  onClick={() => {
                    if (!isDisabled(person)) {
                      toggleActive(person);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={person.active}
                    disabled={isDisabled(person)}
                  />
                  {person.name}
                </div>
              );
            })}
      </div>
    </>
  );
};

const deleteIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="20"
    viewBox="0 0 24 24"
    width="20"
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);
