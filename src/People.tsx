import React from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import AddPerson from "./AddPerson";

export type ReservePerson = {
  name: string;
  active?: boolean;
};

type Props = {
  people: ReservePerson[];
  toggleActive: (arg0: ReservePerson) => void;
  deletePerson: (arg0: ReservePerson) => void;
  addPerson: (arg0: string) => any;
  isDisabled: (arg0: ReservePerson) => boolean;
};

const grid = 8;

const getListStyle = (isDraggingOver: boolean) => ({
  // background: isDraggingOver ? "lightgrey" : undefined,
  padding: grid,
  width: 250,
});

const getItemStyle = (
  isDragging: boolean,
  isDropAnimating: boolean,
  draggableStyle: any
) => {
  if (!isDropAnimating) {
    return draggableStyle;
  }
  return {
    // some basic styles to make the items look a bit nicer
    userSelect: "none",
    // padding: grid * 2,
    marginBottom: `${grid}px`,
    // margin: `0 0 ${grid}px 0`,

    // styles we need to apply on draggables
    ...draggableStyle,
    transitionDuration: `0.001s`,
  };
};

export const People = ({
  people,
  toggleActive,
  isDisabled,
  deletePerson,
  addPerson,
}: Props) => {
  const sortedPeople = [...(people || [])].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      sensitivity: "accent",
    })
  );

  return (
    <>
      <DragDropContext
        onDragEnd={(result) => {
          if (!(result.destination?.droppableId === "delete")) {
            return;
          }
          const person = sortedPeople[result.source.index];
          deletePerson(person);
        }}
      >
        <div>
          <AddPerson onAdd={addPerson} placeholder={"Enter a name"} />
          <Droppable droppableId="delete">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{
                  fill: snapshot.isDraggingOver ? "red" : "black",
                }}
              >
                {deleteIcon}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <Droppable droppableId="people" isDropDisabled={true}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={getListStyle(snapshot.isDraggingOver)}
              >
                {sortedPeople.map((person, index) => {
                  return (
                    <Draggable
                      key={person.name}
                      draggableId={person.name}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            snapshot.isDropAnimating,
                            provided.draggableProps.style
                          )}
                          onClick={() => {
                            if (!isDisabled(person)) {
                              toggleActive(person);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={person.active}
                            onChange={(e) => {}}
                            disabled={isDisabled(person)}
                          />
                          {person.name}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </>
  );
};

const deleteIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="40"
    viewBox="0 0 24 24"
    width="40"
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);
