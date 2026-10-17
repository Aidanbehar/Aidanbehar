/* 7-card hand ranking from the CFR+ archive (game.c / evalHandTables),
   Copyright (C) 2011 by the Computer Poker Research Group, University of Alberta.
   See LICENCE-CFR_plus.txt. rankCardset is copied unchanged except for being made static inline. */
#ifndef ACPC_EVAL_H
#define ACPC_EVAL_H
#include <stdint.h>
#define HANDCLASS_SINGLE_CARD 0
#define HANDCLASS_PAIR 1287
#define HANDCLASS_TWO_PAIR 5005
#define HANDCLASS_TRIPS 8606
#define HANDCLASS_STRAIGHT 9620
#define HANDCLASS_FLUSH 9633
#define HANDCLASS_FULL_HOUSE 10920
#define HANDCLASS_QUADS 11934
#define HANDCLASS_STRAIGHT_FLUSH 12103
typedef union { uint16_t bySuit[ 4 ]; uint64_t cards; } Cardset;
#include "evalHandTables"
static inline
int rankCardset( const Cardset cards )
{
  int postponed, r;
  Cardset sets;

  postponed = oneSuitVal[ cards.bySuit[ 0 ] ];
  if( oneSuitVal[ cards.bySuit[ 1 ] ] > postponed ) {
    postponed = oneSuitVal[ cards.bySuit[ 1 ] ];
  }
  if( oneSuitVal[ cards.bySuit[ 2 ] ] > postponed ) {
    postponed = oneSuitVal[ cards.bySuit[ 2 ] ];
  }
  if( oneSuitVal[ cards.bySuit[ 3 ] ] > postponed ) {
    postponed = oneSuitVal[ cards.bySuit[ 3 ] ];
  }
  if( postponed >= HANDCLASS_STRAIGHT_FLUSH ) {
    /* straight flush */

    return postponed;
  }

  sets.bySuit[ 0 ] = cards.bySuit[ 0 ] | cards.bySuit[ 1 ];
  sets.bySuit[ 1 ] = cards.bySuit[ 0 ] & cards.bySuit[ 1 ];
  sets.bySuit[ 2 ] = sets.bySuit[ 1 ] & cards.bySuit[ 2 ];
  sets.bySuit[ 1 ] |= sets.bySuit[ 0 ] & cards.bySuit[ 2 ];
  sets.bySuit[ 0 ] |= cards.bySuit[ 2 ];
  sets.bySuit[ 3 ] = sets.bySuit[ 2 ] & cards.bySuit[ 3 ];
  sets.bySuit[ 2 ] |= sets.bySuit[ 1 ] & cards.bySuit[ 3 ];
  sets.bySuit[ 1 ] |= sets.bySuit[ 0 ] & cards.bySuit[ 3 ];
  sets.bySuit[ 0 ] |= cards.bySuit[ 3 ];

  if( sets.bySuit[ 3 ] ) {
    /* quads */

    r = topBit[ sets.bySuit[ 3 ] ];
    return quadsVal[ r ] + topBit[ sets.bySuit[ 0 ] ^ ( 1 << r ) ];
  }

  if( sets.bySuit[ 2 ] ) {
    /* trips or full house */

    r = topBit[ sets.bySuit[ 2 ] ];
    sets.bySuit[ 1 ] ^= ( 1 << r );
    if( sets.bySuit[ 1 ] ) {
      /* full house */

      return tripsVal[ r ] + fullHouseOtherVal
	+ topBit[ sets.bySuit[ 1 ] ];
    }

    if( postponed ) {
      /* flush */

      return postponed;
    }

    postponed = anySuitVal[ sets.bySuit[ 0 ] ];
    if( postponed >= HANDCLASS_STRAIGHT ) {
      /* straight */

      return postponed;
    }

    /* trips */
    sets.bySuit[ 0 ] ^= ( 1 << r );
    return tripsVal[ r ] + tripsOtherVal[ sets.bySuit[ 0 ] ];
  } else {

    if( postponed ) {
      /* flush */

      return postponed;
    }

    postponed = anySuitVal[ sets.bySuit[ 0 ] ];
    if( postponed >= HANDCLASS_STRAIGHT ) {
      /* straight */

      return postponed;
    }
  }

  if( sets.bySuit[ 1 ] ) {
    /* pair or two pair */

    r = topBit[ sets.bySuit[ 1 ] ];
    sets.bySuit[ 0 ] ^= ( 1 << r );
    sets.bySuit[ 1 ] ^= ( 1 << r );
    if( sets.bySuit[ 1 ] ) {
      /* two pair */

      sets.bySuit[ 0 ] ^= ( 1 << topBit[ sets.bySuit[ 1 ] ] );
      return pairsVal[ r ]
	+ twoPairOtherVal[ topBit[ sets.bySuit[ 1 ] ] ]
	+ topBit[ sets.bySuit[ 0 ] ];
    }

    return pairsVal[ r ] + pairOtherVal[ sets.bySuit[ 0 ] ];
  }

  return postponed;
}
#endif
