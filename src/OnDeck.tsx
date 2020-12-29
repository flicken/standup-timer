import React, { useRef, useState } from "react";
import "./App.css";

import produce from "immer";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { reorder } from "./utils";

type Props = {
  names: string[];
  setNames: (n: string[]) => any;
  handleDelete: (n: string, i: number) => any;
};

export default function OnDeck({ names, setNames, handleDelete }: Props) {
  return (
    <DragDropContext
      onDragEnd={(result) => {
        if (!result.destination) {
          return;
        }

        const items = reorder(
          names,
          result.source.index,
          result.destination.index
        );

        setNames(items);
      }}
    >
      <Droppable droppableId="droppable">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            style={getListStyle(snapshot.isDraggingOver)}
          >
            {names.map((name, index) => (
              <Draggable
                key={`onDeck.${index}`}
                draggableId={`onDeck.${index}`}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={getItemStyle(
                      snapshot.isDragging,
                      provided.draggableProps.style
                    )}
                  >
                    <span onClick={(e) => handleDelete(name, index)}>
                      {deleteIcon}
                    </span>
                    {name}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

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

const grid = 8;

const getListStyle = (isDraggingOver: boolean) => ({
  // background: isDraggingOver ? "lightgrey" : undefined,
  padding: grid,
  width: 250,
});

const getItemStyle = (isDragging: boolean, draggableStyle: any) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: "none",
  // padding: grid * 2,
  marginBottom: `${grid}px`,
  // margin: `0 0 ${grid}px 0`,

  // styles we need to apply on draggables
  ...draggableStyle,
});
