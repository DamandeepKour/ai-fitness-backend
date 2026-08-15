const parseDietType = (dietType = "") => {
    const type = dietType.toLowerCase().trim().replace(/[\s-]+/g, "_");
    const isJain = type === "jain";
    const isNonVeg = type === "non_veg";
    const isEgg = !isNonVeg && type.includes("egg");
    // Everything except explicit non-veg is vegetarian (incl. jain and veg+egg).
    const isVeg = !isNonVeg;

    return {
      isVeg,
      isEgg,
      isNonVeg,
      isJain,
    };
  };

  export default parseDietType;